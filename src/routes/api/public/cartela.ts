import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { acessoCartelaSchema, clienteConfere, montarCartela, PREFIXO_FOTO } from "@/lib/cartela-publica";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

const responder = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });

/**
 * Leitura do CGS para o aplicativo Cartela Digital.
 * Usa a chave de serviço, se existir, ou a conta de integração do CGS (e-mail e senha guardados como segredos).
 */
async function clienteServidor() {
  const url = process.env["SUPABASE_URL"];
  const servico = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const publica = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const email = process.env["CGS_INTEGRACAO_EMAIL"];
  const senha = process.env["CGS_INTEGRACAO_SENHA"];
  if (!url) return null;
  const opcoes = { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } };

  if (servico) return createClient<Database>(url, servico, opcoes);
  if (!publica || !email || !senha) return null;

  const supabase = createClient<Database>(url, publica, opcoes);
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    console.error("CGS integração: falha ao entrar com a conta de integração", error.message);
    return null;
  }
  return supabase;
}

export const Route = createFileRoute("/api/public/cartela")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let corpo: unknown;
        try {
          corpo = await request.json();
        } catch {
          return responder({ error: "Envie telefone e CPF." }, 400);
        }
        const acesso = acessoCartelaSchema.safeParse(corpo);
        if (!acesso.success) {
          return responder({ error: acesso.error.issues[0]?.message ?? "Telefone ou CPF inválido." }, 400);
        }

        const supabase = await clienteServidor();
        if (!supabase) return responder({ error: "Consulta do CGS indisponível no momento." }, 503);

        // Telefone e CPF podem estar salvos com ou sem pontuação: compara apenas os números.
        const candidatos: { id: string; telefone: string | null; cpf: string | null }[] = [];
        for (let inicio = 0; ; inicio += 1000) {
          const { data, error } = await supabase
            .from("clientes")
            .select("id, telefone, cpf")
            .not("cpf", "is", null)
            .range(inicio, inicio + 999);
          if (error) {
            console.error("CGS integração: erro ao buscar clientes", error.message);
            return responder({ error: "Não foi possível consultar o CGS." }, 500);
          }
          candidatos.push(...(data ?? []));
          if (!data || data.length < 1000) break;
        }

        const encontrado = candidatos.find((c) => clienteConfere(c, acesso.data));
        if (!encontrado) return responder({ error: "Associado não encontrado." }, 404);

        const [cliente, selos, foto] = await Promise.all([
          supabase
            .from("clientes")
            .select("nome, associado, carteira, pontos, programada, data_sorteada, numero_sorteado")
            .eq("id", encontrado.id)
            .single(),
          supabase.from("selos_cliente").select("selo, data").eq("cliente_id", encontrado.id).order("data"),
          supabase.from("configuracoes").select("valor").eq("chave", `${PREFIXO_FOTO}${encontrado.id}`).maybeSingle(),
        ]);
        if (cliente.error || !cliente.data) return responder({ error: "Associado não encontrado." }, 404);

        return responder(montarCartela(cliente.data, selos.data ?? [], foto.data?.valor));
      },
    },
  },
});
