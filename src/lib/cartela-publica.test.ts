import { describe, expect, it } from "vitest";
import { acessoCartelaSchema, clienteConfere, montarCartela } from "./cartela-publica";

const acesso = acessoCartelaSchema.parse({ telefone: "+55 (11) 98812-4410", cpf: "123.456.789-01" });

describe("consulta da cartela pelo Cartela Digital", () => {
  it("encontra o cliente só quando telefone e CPF conferem, com ou sem pontuação", () => {
    expect(clienteConfere({ telefone: "(11) 98812-4410", cpf: "12345678901" }, acesso)).toBe(true);
    expect(clienteConfere({ telefone: "11988124410", cpf: "999.999.999-99" }, acesso)).toBe(false);
    expect(clienteConfere({ telefone: "(11) 90000-0000", cpf: "123.456.789-01" }, acesso)).toBe(false);
    expect(clienteConfere({ telefone: null, cpf: "123.456.789-01" }, acesso)).toBe(false);
  });

  it("envia a foto do cliente salva no CGS", () => {
    const foto = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const base = { nome: "Teste", associado: "AS-1", carteira: "CGS-1", pontos: 28, programada: false, data_sorteada: null, numero_sorteado: null };
    const cartela = montarCartela(base, [{ selo: 7, data: "2026-10-11" }], foto);
    expect(cartela.foto).toBe(foto);
    expect(cartela.faltam).toBe(22);
    expect(montarCartela(base, [], null).foto).toBeNull();
    expect(montarCartela(base, [], "javascript:alert(1)").foto).toBeNull();
  });

  it("envia as compras do cliente com produto, loja, quantidade, valor unitário, pontos e selo", () => {
    const base = { nome: "Teste", associado: null, carteira: null, pontos: 0, programada: false, data_sorteada: null, numero_sorteado: null };
    const cartela = montarCartela(base, [], null, [
      { data: "2026-10-20", quantidade: 2, valor_unitario: 15.5, pontos: 4, selo: 12, produtos: { nome: "Dipirona" }, lojas: { nome: "Loja Centro" } },
      { data: "2026-10-21", quantidade: 1, valor_unitario: 9.9, pontos: 1, selo: 3, produtos: null, lojas: null },
    ]);
    expect(cartela.compras).toEqual([
      { data: "2026-10-20", produto: "Dipirona", loja: "Loja Centro", quantidade: 2, valor_unitario: 15.5, pontos: 4, selo: 12 },
      { data: "2026-10-21", produto: null, loja: null, quantidade: 1, valor_unitario: 9.9, pontos: 1, selo: 3 },
    ]);
    expect(montarCartela(base, [], null).compras).toEqual([]);
  });

  describe("selos depois do prêmio recebido", () => {
    const base = { nome: "Teste", associado: null, carteira: null, pontos: 47, programada: true, data_sorteada: "2026-09-16", numero_sorteado: 16 };
    const selos = [
      { selo: 7, data: "2026-08-18" },
      { selo: 5, data: "2026-09-16" },
      { selo: 1, data: "2026-09-17" },
      { selo: 5, data: "2026-10-27" },
    ];
    const sorteio = { numero: 16, mes_referencia: "09/2026", data_sorteio: "2026-08-18" };

    it("para de enviar os selos até a data sorteada quando o prêmio foi pago", () => {
      const cartela = montarCartela(base, selos, null, [], [{ ...sorteio, status_premio: "Pago" }]);
      expect(cartela.selos).toEqual([
        { selo: 1, data: "2026-09-17" },
        { selo: 5, data: "2026-10-27" },
      ]);
    });

    it("continua enviando todos os selos enquanto o prêmio não foi recebido", () => {
      for (const status_premio of ["Aguardando pagamento", "Aguardando apresentação", "Cancelado", "Expirado"]) {
        expect(montarCartela(base, selos, null, [], [{ ...sorteio, status_premio }]).selos).toHaveLength(4);
      }
      expect(montarCartela(base, selos, null).selos).toHaveLength(4);
    });
  });
});
