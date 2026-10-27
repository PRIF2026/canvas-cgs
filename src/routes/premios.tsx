import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatCard, StatusPill } from "@/components/cgs/ui-bits";
import { brl, dataBr } from "@/lib/cgs-data";
import { cgsKeys, getErrorMessage, useSorteios } from "@/lib/cgs-db";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/premios")({
  head: () => ({
    meta: [
      { title: "Prêmios · PROJETO 7 CORES – CGS" },
      { name: "description", content: "Controle de prêmios e pagamentos: valor original, divisão por ganhadores, status e datas." },
      { property: "og:title", content: "Prêmios · PROJETO 7 CORES – CGS" },
      { property: "og:description", content: "Controle de prêmios, divisão por ganhadores e pagamentos." },
    ],
  }),
  component: Premios,
});

const STATUS = ["Todos", "Aguardando apresentação", "Aguardando pagamento", "Pago", "Cancelado", "Expirado"];
const A_PAGAR = "Aguardando pagamento";

/** Data de hoje no fuso local, no formato AAAA-MM-DD. */
function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type SorteioLinha = NonNullable<ReturnType<typeof useSorteios>["data"]>[number];

function Premios() {
  const queryClient = useQueryClient();
  const { data: sorteios = [], isLoading, error } = useSorteios();
  const [filtro, setFiltro] = useState("Todos");
  const [confirmar, setConfirmar] = useState<SorteioLinha | null>(null);

  const valorIndividual = (s: SorteioLinha) => Number(s.valor_original) / Math.max(1, s.ganhadores);
  const lista = sorteios.filter((s) => filtro === "Todos" || s.status_premio === filtro);
  const pagos = sorteios.filter((s) => s.status_premio === "Pago");
  const aPagar = sorteios.filter((s) => s.status_premio === A_PAGAR);

  const pagar = useMutation({
    mutationFn: async (id: string) => {
      // Só paga o que ainda está aguardando pagamento: evita pagamento duplicado.
      const { data, error } = await supabase
        .from("sorteios")
        .update({ status_premio: "Pago", previsao_pagamento: hojeLocal() })
        .eq("id", id)
        .eq("status_premio", A_PAGAR)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Este prêmio já foi pago ou não está aguardando pagamento.");
    },
    onSuccess: () => toast.success("Prêmio marcado como pago."),
    onError: (e) => toast.error(getErrorMessage(e)),
    onSettled: async () => {
      setConfirmar(null);
      await queryClient.invalidateQueries({ queryKey: cgsKeys.sorteios });
    },
  });

  return (
    <>
      <PageHeader
        titulo="Controle de prêmios e pagamentos"
        descricao="O valor do dia é dividido automaticamente pelo número de cartelas premiadas."
        acoes={
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Prêmios pagos" valor={brl(pagos.reduce((a, s) => a + valorIndividual(s), 0))} detalhe={`${pagos.length} registro(s)`} accent={4} />
        <StatCard label="Aguardando pagamento" valor={brl(aPagar.reduce((a, s) => a + valorIndividual(s), 0))} detalhe={`${aPagar.length} registro(s)`} accent={2} />
        <StatCard label="Aguardando apresentação" valor={String(sorteios.filter((s) => s.status_premio === "Aguardando apresentação").length)} detalhe="cartelas a apresentar na data" accent={3} />
        <StatCard label="Expirados" valor={String(sorteios.filter((s) => s.status_premio === "Expirado").length)} detalhe="cartelas descartadas" accent={1} />
      </div>

      <SectionCard titulo={`Prêmios (${lista.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Cliente</th><th className="py-2 pr-3">Cartela</th><th className="py-2 pr-3">Nº</th>
                <th className="py-2 pr-3">Dia</th><th className="py-2 pr-3">Valor original</th><th className="py-2 pr-3">Ganhadores</th>
                <th className="py-2 pr-3">Valor individual</th><th className="py-2 pr-3">Sorteio</th><th className="py-2 pr-3">Pagamento</th>
                <th className="py-2 pr-3">Status</th><th className="py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{s.clientes?.nome ?? "—"}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{s.carteira ?? "—"}</td>
                  <td className="py-2.5 pr-3 font-display font-bold">{s.numero}</td>
                  <td className="py-2.5 pr-3">{s.mes_referencia ? `${s.numero}/${s.mes_referencia}` : s.numero}</td>
                  <td className="py-2.5 pr-3">{brl(Number(s.valor_original))}</td>
                  <td className="py-2.5 pr-3">{s.ganhadores}</td>
                  <td className="py-2.5 pr-3 font-semibold">{brl(valorIndividual(s))}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{dataBr(s.data_sorteio)}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{s.previsao_pagamento ? dataBr(s.previsao_pagamento) : "—"}</td>
                  <td className="py-2.5 pr-3"><StatusPill status={s.status_premio} /></td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={() => setConfirmar(s)}
                      disabled={s.status_premio !== A_PAGAR || pagar.isPending}
                      className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-35"
                    >
                      Pagar
                    </button>
                  </td>
                </tr>
              ))}
              {!lista.length ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-sm text-muted-foreground">
                    {isLoading ? "Carregando prêmios..." : error ? getErrorMessage(error) : "Nenhum prêmio encontrado."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          O sistema bloqueia pagamento duplicado. Depois do pagamento, os selos usados no prêmio deixam de aparecer no Cartela Digital.
        </p>
      </SectionCard>

      <AlertDialog open={!!confirmar} onOpenChange={(aberto) => { if (!aberto && !pagar.isPending) setConfirmar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento do prêmio?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar
                ? `${confirmar.clientes?.nome ?? "Cliente"} vai receber ${brl(valorIndividual(confirmar))} pelo dia ${confirmar.numero}${confirmar.mes_referencia ? `/${confirmar.mes_referencia}` : ""}. Os selos usados neste prêmio deixam de aparecer no Cartela Digital.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pagar.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pagar.isPending}
              onClick={(e) => { e.preventDefault(); if (confirmar) pagar.mutate(confirmar.id); }}
            >
              {pagar.isPending ? "Pagando..." : "Confirmar pagamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
