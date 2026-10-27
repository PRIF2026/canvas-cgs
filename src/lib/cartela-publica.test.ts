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
});
