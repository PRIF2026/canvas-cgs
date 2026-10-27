import { z } from "zod";

export const META_CARTELA = 50;
export const PREFIXO_FOTO = "foto_cliente:";

const digitos = (v: string) => v.replace(/\D/g, "");

/** Telefone sem o código do país (55), para comparar números salvos com ou sem DDI. */
export function telefoneNacional(v: string | null | undefined): string {
  const d = digitos(v ?? "");
  return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
}

export const acessoCartelaSchema = z.object({
  telefone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[\d\s()+.-]+$/)
    .transform(telefoneNacional)
    .refine((v) => /^\d{10,11}$/.test(v), "Informe o telefone com DDD."),
  cpf: z
    .string()
    .trim()
    .max(14)
    .regex(/^[\d.\s-]+$/)
    .transform(digitos)
    .refine((v) => /^\d{11}$/.test(v), "Informe os 11 números do CPF."),
});
export type AcessoCartela = z.infer<typeof acessoCartelaSchema>;

/** O cliente só é encontrado quando telefone E CPF conferem (ignorando pontuação). */
export function clienteConfere(
  cliente: { telefone: string | null; cpf: string | null },
  acesso: AcessoCartela,
): boolean {
  return digitos(cliente.cpf ?? "") === acesso.cpf && telefoneNacional(cliente.telefone) === acesso.telefone;
}

/** Só repassa fotos que são imagens JPEG/PNG/WEBP em data URL ou endereços https. */
export function fotoValida(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (/^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]+$/.test(s)) return s;
  return null;
}

type ClienteCartela = {
  nome: string;
  associado: string | null;
  carteira: string | null;
  pontos: number;
  programada: boolean;
  data_sorteada: string | null;
  numero_sorteado: number | null;
};

/** Venda do cliente como vem do banco, com os nomes do produto e da loja. */
export type VendaCartela = {
  data: string | null;
  quantidade: number;
  valor_unitario: number;
  pontos: number;
  selo: number;
  produtos: { nome: string } | null;
  lojas: { nome: string } | null;
};

export function montarCompras(vendas: VendaCartela[]) {
  return vendas.map((v) => ({
    data: v.data,
    produto: v.produtos?.nome ?? null,
    loja: v.lojas?.nome ?? null,
    quantidade: Number(v.quantidade) || 0,
    valor_unitario: Number(v.valor_unitario) || 0,
    pontos: Number(v.pontos) || 0,
    selo: Number(v.selo) || 0,
  }));
}

/** Sorteio do cliente como vem do banco. */
export type SorteioCartela = {
  numero: number;
  mes_referencia: string | null;
  data_sorteio: string | null;
  status_premio: string;
};

/** Situações em que o cliente já recebeu o prêmio. */
const PREMIO_RECEBIDO = new Set(["pago", "prêmio recebido", "premio recebido"]);

/** Data do prêmio (a data sorteada): dia sorteado no mês de referência "MM/AAAA". */
export function dataDoPremio(s: SorteioCartela): string | null {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(s.mes_referencia?.trim() ?? "");
  const dia = Number(s.numero);
  if (m?.[1] && m[2] && dia >= 1 && dia <= 31) return `${m[2]}-${m[1].padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  return s.data_sorteio ? s.data_sorteio.slice(0, 10) : null;
}

/**
 * Tira os selos usados em prêmios já recebidos: selos com data até a data sorteada
 * do prêmio recebido mais recente. Os selos depois dessa data continuam na cartela.
 */
export function selosEmAberto<T extends { data: string | null }>(selos: T[], sorteios: SorteioCartela[]): T[] {
  const corte = sorteios
    .filter((s) => PREMIO_RECEBIDO.has(s.status_premio.trim().toLowerCase()))
    .map(dataDoPremio)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  if (!corte) return selos;
  return selos.filter((s) => !s.data || s.data.slice(0, 10) > corte);
}

export function montarCartela(
  cliente: ClienteCartela,
  selosCliente: { selo: number; data: string | null }[],
  foto: string | null | undefined,
  vendas: VendaCartela[] = [],
  sorteios: SorteioCartela[] = [],
) {
  const selos = selosEmAberto(selosCliente, sorteios);
  const pontos = Math.max(0, Number(cliente.pontos) || 0);
  return {
    nome: cliente.nome,
    associado: cliente.associado,
    cartela: cliente.carteira,
    pontos,
    meta: META_CARTELA,
    faltam: Math.max(0, META_CARTELA - pontos),
    programada: cliente.programada,
    data_sorteada: cliente.data_sorteada,
    numero_sorteado: cliente.numero_sorteado,
    foto: fotoValida(foto),
    selos: selos.map((s) => ({ selo: s.selo, data: s.data })),
    compras: montarCompras(vendas),
  };
}
