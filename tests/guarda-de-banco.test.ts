import { describe, expect, it } from "vitest";
import {
  PROJETOS_DE_TESTE,
  PROJETO_DE_TESTE_CI,
  identificadorDoProjeto,
  identificadorDoProjetoStorage,
  validar,
  validarSoTeste,
} from "./guarda-de-banco";

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
const CONFERENCIAS_ESPERADAS = 14;

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

  it("validarSoTeste aprova o projeto de teste", () => {
    const url = urlDoProjeto(PROJETO_DE_TESTE_CI);
    expect(() =>
      validarSoTeste({ DATABASE_URL: url, AUTH_DATABASE_URL: url, DIRECT_URL: url }),
    ).not.toThrow();
    conferencias++;
  });

  it("validarSoTeste recusa o projeto de desenvolvimento — diferente de validar", () => {
    // O contraste que prova o motivo desta função existir: `validar` sozinho
    // aprovaria isto (é um dos dois projetos permitidos). `validarSoTeste`
    // não pode, porque quem chama é o passo que derruba o schema inteiro.
    const desenvolvimento = PROJETOS_DE_TESTE.find((p) => p !== PROJETO_DE_TESTE_CI)!;
    const url = urlDoProjeto(desenvolvimento);
    const env = { DATABASE_URL: url, AUTH_DATABASE_URL: url, DIRECT_URL: url };

    expect(() => validar(env)).not.toThrow();
    expect(() => validarSoTeste(env)).toThrow();
    conferencias++;
  });

  it("validarSoTeste recusa o que validar já recusaria", () => {
    const url = urlDoProjeto("aaaaaaaaaaaaaaaaaaaa");
    expect(() =>
      validarSoTeste({ DATABASE_URL: url, AUTH_DATABASE_URL: url, DIRECT_URL: url }),
    ).toThrow();
    conferencias++;
  });
});

/**
 * `SUPABASE_URL` (item 5, Tarefa 4) não é conexão de banco — é a API de
 * storage do mesmo projeto, e `tests/isolamento/comprovantes.test.ts` grava
 * e apaga objeto de verdade nela. Mesmo risco das três URLs de banco, formato
 * de URL diferente — por isso a prova é separada, não reaproveita
 * `urlDoProjeto`/`envPermitido`.
 */
describe("guarda-de-banco: SUPABASE_URL, quando definida, também precisa ser um projeto permitido", () => {
  it("identificadorDoProjetoStorage reconhece o formato da API do Supabase (contraste)", () => {
    expect(
      identificadorDoProjetoStorage(`https://${PROJETOS_DE_TESTE[0]}.supabase.co`),
    ).toBe(PROJETOS_DE_TESTE[0]);
    conferencias++;
  });

  it("não definida não recusa — é opcional para quem não roda teste de storage", () => {
    expect(() => validar(envPermitido())).not.toThrow();
    conferencias++;
  });

  it("projeto permitido passa", () => {
    expect(() =>
      validar({
        ...envPermitido(),
        SUPABASE_URL: `https://${PROJETOS_DE_TESTE[0]}.supabase.co`,
      }),
    ).not.toThrow();
    conferencias++;
  });

  it("projeto desconhecido recusa", () => {
    expect(() =>
      validar({
        ...envPermitido(),
        SUPABASE_URL: "https://aaaaaaaaaaaaaaaaaaaa.supabase.co",
      }),
    ).toThrow();
    conferencias++;
  });

  it("formato irreconhecível recusa — mesma falha fechada das URLs de banco", () => {
    expect(() =>
      validar({ ...envPermitido(), SUPABASE_URL: "https://storage.googleapis.com" }),
    ).toThrow();
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
