"use client";

import { useState } from "react";
import { LinhaDeLista } from "./LinhaDeLista";
import { AcaoCobrarNoWhatsApp } from "./AcaoCobrarNoWhatsApp";
import { Etiqueta } from "./EtiquetaSituacao";
import { CLASSE_DO_PRAZO, textoDoPrazo, type CobrancaParaLista } from "@/lib/servicos/cobrancas-situacao";
import { formatarCentavos } from "@/lib/utils/dinheiro";

/**
 * A linha de uma cobrança de relatório com 2+ fretes (item 7, segundo
 * commit — `docs/especificacao.md` §4.5: "uma cobrança gerada por relatório
 * é uma linha só, não uma por frete"). Estende `LinhaDeLista`
 * (`acessorio`/`rodape`) em vez de copiar a marcação dela — achado do
 * `/revisar`, `CLAUDE.md` §8. Peça nova só no que não existia: o chevron e
 * a lista expandida; o cartão em si é o mesmo de sempre.
 *
 * **Achado que motivou o desenho** (fundador, 29/08/2026): quem está em
 * Cobranças olhando o dinheiro precisa de um caminho para agir dali — antes
 * desta peça, receber um título de um grupo só era possível pela tela de
 * Fretes (o frete específico → Marcar recebido), fora da tela onde a
 * pendência aparece. Só apareceu perguntando "como ela faz isso".
 *
 * **Sem "Marcar recebido" na linha agrupada** — registrar contra "o" título
 * de um grupo de N receberia 1/N do valor em silêncio, exatamente o defeito
 * que `CLAUDE.md` §2 já nomeia para regra que fala de uma coleção inteira.
 * Para receber, o chevron expande e revela cada título como uma
 * `LinhaDeLista` normal, com o próprio deslizar (que já funciona,
 * inalterado). O toque no corpo da linha vai para o Documento A4 do
 * relatório — já mostra todos os fretes e o total certo; não tem "Marcar
 * recebido" ali (é documento, não uma tela de ação). Exceção registrada em
 * `docs/componentes.md`, § "Cobranças" — quem manda no conteúdo da tela
 * (`CLAUDE.md` §13), não só no plano.
 *
 * **"Cobrar no WhatsApp" só aparece quando o grupo pode ser cobrado** —
 * mesma condição do caminho não agrupado (`ListaCobrancas.tsx`): nunca para
 * boleto (o banco já avisa) nem para grupo já recebido. Registra em TODOS
 * os `agrupado.tituloIds` no mesmo instante
 * (`registrarCobrancaEnviadaEmGrupo`) — nunca um título isolado, que
 * deixaria o grupo com marca inconsistente.
 *
 * **Pergunta 1 ao Design — o chevron.** Alvo de 48px, medido contra o CSS
 * compilado (`--spacing: 1px`) — `w-48` dentro do `min-h-78` da linha,
 * `items-stretch` faz o botão herdar a altura real (≥78px). Não confirmado
 * ao vivo num navegador autenticado (sem conta de teste à mão nesta
 * sessão).
 * **Pergunta 2 ao Design — o grupo aberto.** As linhas reveladas hoje só se
 * distinguem por recuo (`pl-16`) e um rótulo ("Fretes desta cobrança") —
 * nenhuma cor nova, porque `docs/estilo.md` já registra "o app não tem
 * borda nenhuma — separa por fundo" e as duas tonalidades existentes já têm
 * outro significado (estado desabilitado de pílula).
 */

type ResultadoAcao = { ok: true } | { ok: false; erro: string };

type Props = {
  /** `cobranca.agrupado` precisa estar presente — quem chama já filtrou por isso. */
  cobranca: CobrancaParaLista;
  hoje: string;
  empresaNome: string;
  chavePixEmpresa: string | null;
  onReceber: (item: { tituloId: string; saldoCentavos: number }) => void;
  registrarGrupo: (tituloIds: string[]) => Promise<ResultadoAcao>;
  salvarTelefoneCliente: (clienteId: string, telefone: string) => Promise<ResultadoAcao>;
  salvarChavePix: (chavePix: string) => Promise<ResultadoAcao>;
};

/** Boleto + Parcial + prazo — mesmo bloco no cabeçalho do grupo e em cada frete revelado, extraído para não duplicar (`CLAUDE.md` §6, achado do segundo `/revisar`). */
function MarcaDaLinha({ cobranca, hoje }: { cobranca: CobrancaParaLista; hoje: string }) {
  return (
    <>
      {cobranca.boleto ? <Etiqueta texto="Boleto" classeTexto="text-tinta-fraca" /> : null}
      {cobranca.parcial ? (
        <Etiqueta texto="Parcial" classeTexto="text-parcial-apoio" classeFundo="bg-parcial-fundo" />
      ) : null}
      <span className={`text-apoio font-medium ${CLASSE_DO_PRAZO[cobranca.grupo]}`}>
        {textoDoPrazo(cobranca, hoje)}
      </span>
    </>
  );
}

function ChevronDoGrupo({ aberto, onClick }: { aberto: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      aria-label={aberto ? "Recolher fretes desta cobrança" : "Ver fretes desta cobrança"}
      className="flex w-48 flex-none items-center justify-center text-[19px] font-bold leading-[1] text-tinta-apoio active:bg-principal-desabilitado"
    >
      <span className="inline-block" style={{ transform: aberto ? "rotate(90deg)" : undefined }}>
        ›
      </span>
    </button>
  );
}

export function LinhaCobrancaAgrupada({
  cobranca,
  hoje,
  empresaNome,
  chavePixEmpresa,
  onReceber,
  registrarGrupo,
  salvarTelefoneCliente,
  salvarChavePix,
}: Props) {
  const [expandido, setExpandido] = useState(false);
  const agrupado = cobranca.agrupado;
  if (!agrupado) return null;

  // Mesma condição de `ListaCobrancas.tsx` para a linha não agrupada:
  // boleto nunca cobra por WhatsApp (o banco já avisa), e "Recebidas" já
  // está pago.
  const podeCobrar = !cobranca.boleto && cobranca.grupo !== "recebidas";

  return (
    <div className="flex flex-col gap-6">
      <LinhaDeLista
        href={`/relatorio/${agrupado.relatorioId}`}
        nome={cobranca.cliente}
        apoio={`${agrupado.fretes} fretes`}
        valorCentavos={cobranca.valorCentavos}
        marca={<MarcaDaLinha cobranca={cobranca} hoje={hoje} />}
        acessorio={<ChevronDoGrupo aberto={expandido} onClick={() => setExpandido((v) => !v)} />}
        rodape={
          podeCobrar ? (
            <div className="flex items-center gap-12">
              <AcaoCobrarNoWhatsApp
                variante="pilula"
                tituloIds={agrupado.tituloIds}
                cliente={{
                  id: cobranca.clienteId,
                  nome: cobranca.cliente,
                  telefone: cobranca.clienteTelefone,
                }}
                dadosMensagem={{
                  empresa: empresaNome,
                  cliente: cobranca.cliente,
                  rota: null,
                  periodo: agrupado.periodo,
                  valor: formatarCentavos(cobranca.valorCentavos),
                  vencimento: cobranca.vencimentoFormatado ?? "",
                  vencido: cobranca.grupo === "vencidas",
                }}
                chavePixEmpresa={chavePixEmpresa}
                registrar={registrarGrupo}
                salvarTelefoneCliente={salvarTelefoneCliente}
                salvarChavePix={salvarChavePix}
              />
              {cobranca.marcaCobrado ? (
                <span className="text-apoio font-medium text-tinta-apoio">
                  {cobranca.marcaCobrado}
                </span>
              ) : null}
            </div>
          ) : undefined
        }
      />

      {expandido ? (
        <div className="flex flex-col gap-6 pl-16">
          <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Fretes desta cobrança
          </span>
          {agrupado.itens.map((item) => (
            <LinhaDeLista
              key={item.id}
              href={`/cobrancas/${item.id}`}
              nome={item.cliente}
              apoio={item.referencia ?? undefined}
              valorCentavos={item.valorCentavos}
              marca={<MarcaDaLinha cobranca={item} hoje={hoje} />}
              aoDeslizar={
                item.grupo === "recebidas"
                  ? undefined
                  : {
                      rotulo: "Marcar recebido",
                      onRevelar: () =>
                        onReceber({ tituloId: item.id, saldoCentavos: item.valorCentavos }),
                    }
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
