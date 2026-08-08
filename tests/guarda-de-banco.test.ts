import { describe, expect, it } from "vitest";
import { PROJETOS_DE_TESTE, identificadorDoProjeto, validar } from "./guarda-de-banco";

/**
 * A prova da tarefa 9b (`CLAUDE.md` §3, item 4).
 *
 * `guarda-de-banco.ts` já roda como `setupFiles` do vitest — o que falta é
 * provar que, se alguém mexer nela, ela continua fazendo exatamente o que diz
 * fazer: aprovar o banco de teste certo, recusar um projeto desconhecido, e
 * recusar (nunca aprovar por omissão) uma URL que não tem o formato esperado.
 * Conferência manual, feita uma vez, não protege a regressão de amanhã.
 */

function urlDoProjeto(projeto: string, papel = "fretigate_app"): string {
  return `postgresql://${papel}.${projeto}:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
}

function envPermitido(): Record<string, string> {
  const url = urlDoProjeto(PROJETOS_DE_TESTE[0]);
  return { DATABASE_URL: url, AUTH_DATABASE_URL: url, DIRECT_URL: url };
}

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 6;

describe("guarda-de-banco: a suíte só roda contra o projeto de teste certo", () => {
  it("identificadorDoProjeto reconhece o formato do Supabase (contraste)", () => {
    // Sem isto, um erro na regex faria toda verificação abaixo passar sem ter
    // reconhecido projeto nenhum — inclusive a que devia recusar.
    expect(identificadorDoProjeto(urlDoProjeto(PROJETOS_DE_TESTE[0]))).toBe(
      PROJETOS_DE_TESTE[0],
    );
    conferencias++;
  });

  it("endereço permitido passa", () => {
    expect(() => validar(envPermitido())).not.toThrow();
    conferencias++;
  });

  it("endereço desconhecido recusa", () => {
    const url = urlDoProjeto("aaaaaaaaaaaaaaaaaaaa");
    expect(() =>
      validar({ DATABASE_URL: url, AUTH_DATABASE_URL: url, DIRECT_URL: url }),
    ).toThrow();
    conferencias++;
  });

  it("formato irreconhecível também recusa — é o que separa falha fechada de aberta", () => {
    // Um banco local não tem `usuario.<20 letras>`. O erro fácil seria "não
    // reconheci, então deixo passar" — isso aprovaria por omissão qualquer
    // string malformada, incluindo produção de outro provedor.
    const url = "postgresql://postgres:senha@localhost:5432/fretigate_dev";
    expect(() =>
      validar({ DATABASE_URL: url, AUTH_DATABASE_URL: url, DIRECT_URL: url }),
    ).toThrow();
    conferencias++;
  });

  it("variável não definida recusa", () => {
    const url = urlDoProjeto(PROJETOS_DE_TESTE[0]);
    expect(() =>
      validar({ DATABASE_URL: url, AUTH_DATABASE_URL: url }),
    ).toThrow();
    conferencias++;
  });

  it("NODE_ENV de produção recusa, mesmo com URLs permitidas", () => {
    expect(() =>
      validar({ ...envPermitido(), NODE_ENV: "production" }),
    ).toThrow();
    conferencias++;
  });

  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
