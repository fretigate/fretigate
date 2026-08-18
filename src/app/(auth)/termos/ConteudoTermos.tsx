"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { ChipEscolha } from "@/components/ui/ChipEscolha";

type Aba = "uso" | "privacidade";

/**
 * As duas abas do documento — docs/componentes.md, tela "Termos e
 * privacidade". Não existe componente de aba em nenhum documento do Design;
 * reaproveita o chip de seleção (mesma peça da pergunta "como você conheceu
 * o FretiGate?" no cadastro — um controle de estado "escolha uma entre
 * duas", só isso muda). Decisão do fundador, registrada como lacuna do
 * Design (tarefa 8, fatia 2, 07/08/2026): o chip usa `role="radio"`, não
 * `role="tab"` — a semântica de acessibilidade de aba real fica pendente de
 * o Design definir o próprio componente.
 */
const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "uso", rotulo: "Termos de uso" },
  { chave: "privacidade", rotulo: "Política de privacidade" },
];

const PARAGRAFOS_USO = [
  "Ao usar o FretiGate, a empresa contrata um sistema de gestão para o " +
    "controle dos fretes que ela mesma lança — cliente, carga, rota, " +
    "motorista e valor. O produto não emite documento fiscal, não processa " +
    "pagamento e não fala com o motorista ou com o cliente final em nome da " +
    "empresa.",
  "A empresa é responsável pelos dados que lança no sistema, inclusive " +
    "dados de clientes e motoristas — o FretiGate guarda esses dados por " +
    "conta da empresa, não os usa para nenhum outro fim salvo o uso " +
    "agregado e anonimizado descrito na Política de privacidade, e a " +
    "empresa segue sendo quem decide o que fazer com eles.",
  "O plano gratuito continua disponível enquanto o limite de um caminhão " +
    "for respeitado. O plano pago é cobrado por assinatura, mensal ou " +
    "anual, e pode ser cancelado a qualquer momento — o acesso de leitura " +
    "e exportação continua por um período depois do cancelamento.",
  "Dúvida sobre estes Termos: fala com a gente pelo e-mail de contato do " +
    "FretiGate.",
];

const PARAGRAFOS_PRIVACIDADE = [
  "O FretiGate guarda os dados que a empresa lança para operar o sistema: " +
    "cadastro da empresa, dos usuários, dos clientes, dos caminhões, dos " +
    "motoristas e dos fretes. Dados de clientes e motoristas são de " +
    "terceiros — a empresa é a controladora desses dados, e o FretiGate é o " +
    "operador: usa apenas para prestar o serviço contratado, nunca para " +
    "outro fim salvo o uso agregado e anonimizado descrito abaixo, e nunca " +
    "de forma identificável fora disso.",
  "Os serviços abaixo têm acesso a parte dos dados, cada um só ao que " +
    "precisa para fazer o que faz: Supabase (banco de dados e " +
    "armazenamento de arquivos), Vercel (hospedagem), Resend (envio de " +
    "e-mail de recuperação de senha, confirmação e convite), Cloudflare e " +
    "Google (encaminhamento e caixa do e-mail de contato) e um fornecedor " +
    "de inteligência artificial, ainda em avaliação, para a importação de " +
    "fretes a partir de conversa colada pela empresa — nenhum deles treina " +
    "modelo com esse conteúdo.",
  "O FretiGate usa os dados lançados no sistema para melhorar o produto e " +
    "para produzir informações agregadas sobre o setor de transporte de " +
    "cargas — como médias de valor por rota, volume por região e " +
    "comportamento de mercado —, que podem ser publicadas ou " +
    "compartilhadas, inclusive como material de divulgação. Esse uso é " +
    "sempre agregado e anonimizado: nenhum dado que identifique a empresa, " +
    "seus clientes, motoristas ou fretes individuais é exposto, " +
    "compartilhado ou publicado. A empresa pode pedir, pelo e-mail de " +
    "contato do FretiGate, que seus dados deixem de ser usados dessa forma.",
  // Nunca "remoção" — CLAUDE.md §7: "nada é apagado", com uma única exceção
  // já declarada, que não é esta. Exportar é o que o produto sustenta hoje.
  "A empresa pode pedir a exportação dos seus dados a qualquer momento " +
    "pelo e-mail de contato do FretiGate.",
];

export function ConteudoTermos({ deCadastro }: { deCadastro: boolean }) {
  const [aba, setAba] = useState<Aba>("uso");
  const paragrafos = aba === "uso" ? PARAGRAFOS_USO : PARAGRAFOS_PRIVACIDADE;

  return (
    <div className="mt-24 flex flex-col gap-16">
      <div role="radiogroup" aria-label="Documento" className="flex gap-[8px]">
        {ABAS.map((item) => (
          <ChipEscolha
            key={item.chave}
            selecionado={aba === item.chave}
            onClick={() => setAba(item.chave)}
          >
            {item.rotulo}
          </ChipEscolha>
        ))}
      </div>

      {/* docs/componentes.md, "Corpo de texto fora de sessão". */}
      <div className="flex flex-col gap-16">
        {paragrafos.map((paragrafo, indice) => (
          <p
            key={indice}
            className="text-corpo-fora-sessao text-pretty font-medium leading-[1.5] text-tinta-apoio-forte"
          >
            {paragrafo}
          </p>
        ))}
      </div>

      {deCadastro ? (
        <Botao variante="principal" href="/criar-conta">
          Li e aceito
        </Botao>
      ) : null}
    </div>
  );
}
