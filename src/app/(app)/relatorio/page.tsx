import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { buscarCliente, listarClientes } from "@/lib/servicos/clientes";
import { listarServicosParaRelatorio } from "@/lib/servicos/relatorios";
import { vencimentoPadrao } from "@/lib/servicos/titulos";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { resolverPeriodoDoRelatorio } from "@/lib/utils/periodo";
import { TelaMontagemRelatorio } from "./TelaMontagemRelatorio";

/**
 * Relatório — montagem (item 7, Tarefa 3, segundo commit —
 * `docs/especificacao.md` §4.4, `docs/planos/item-7-relatorio.md`).
 *
 * **Cliente e período viajam pela URL** (`?cliente=`, `?periodo=`/`de`/`ate`),
 * mesmo padrão de Cobranças/Meus fretes — trocar qualquer um dos dois pede
 * fretes diferentes ao servidor, nunca um recorte sobre o que já veio (não é
 * como o filtro de cliente de Cobranças, que é local sobre uma lista já
 * ampla). `?cliente=` também serve de pré-seleção vinda de outra tela (item
 * 7, Tarefa 4 — ainda não construída), mesmo mecanismo de `fretes/novo`.
 *
 * **Sem período na URL, o padrão é "mês passado"** — evidência corroborante
 * do protótipo (`referencia/.../TelaRelatorio.dc.html`, `CLAUDE.md` §13):
 * um relatório normalmente fecha o mês anterior, não o mês ainda em
 * andamento. Diferente de Cobranças (que abre sem período de propósito,
 * para não esconder cobrança vencida) — aqui não existe "todos os fretes"
 * sem período, então sempre há uma janela ativa.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; periodo?: string; de?: string; ate?: string }>;
}) {
  const sessao = await exigirSessao();
  const { cliente: clienteUrl, periodo: janelaUrl, de, ate } = await searchParams;
  const hoje = diaEmFortaleza(new Date());

  const clienteId = await resolverClientePreSelecionado(sessao.empresaId, clienteUrl);
  const { periodo, janelaEfetiva } = resolverPeriodoDoRelatorio(janelaUrl, de, ate);

  const [clientes, empresa] = await Promise.all([
    listarClientes(sessao.empresaId),
    db(sessao.empresaId).empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { prazo_padrao_dias: true, chave_pix: true },
    }),
  ]);

  const [clienteEscolhido, servicos] = clienteId
    ? await Promise.all([
        buscarCliente(sessao.empresaId, clienteId),
        listarServicosParaRelatorio(sessao.empresaId, clienteId, periodo),
      ])
    : [null, []];

  const vencimentoInicial = vencimentoPadrao(
    hoje,
    clienteEscolhido?.prazo_pagamento_dias ?? null,
    empresa!.prazo_padrao_dias,
  );

  return (
    <TelaMontagemRelatorio
      // `key` muda com cliente/período — força o React a remontar o
      // componente do zero em vez de reaproveitar a instância antiga com
      // `servicos` novo. Sem isso, `incluidos` (useState com inicializador
      // preguiçoso, TelaMontagemRelatorio.tsx) manteria os ids do cliente/
      // período ANTERIOR: um frete novo apareceria já desmarcado por
      // engano (não está no Set antigo), e um relatório poderia sair sem
      // fretes que deveriam estar dentro. Achado ao revisar a própria
      // construção — Next.js App Router reaproveita a instância entre
      // navegações no mesmo segmento de rota, só troca as props.
      key={`${clienteId ?? "sem-cliente"}-${janelaEfetiva}-${de ?? ""}-${ate ?? ""}`}
      hoje={hoje}
      clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
      clienteId={clienteId}
      clienteNome={clienteEscolhido?.nome ?? null}
      janela={janelaEfetiva}
      de={de}
      ate={ate}
      periodo={{ inicio: periodo.inicio.toISOString(), fim: periodo.fim.toISOString() }}
      servicos={servicos}
      vencimentoInicial={vencimentoInicial}
      chavePixEmpresa={empresa!.chave_pix}
    />
  );
}

/** Mesmo padrão de `resolverPreSelecao` (`fretes/novo/page.tsx`) — id da URL nunca usado direto, sempre confirmado contra a empresa. */
async function resolverClientePreSelecionado(
  empresaId: string,
  idBruto: string | undefined,
): Promise<string | null> {
  if (!idBruto || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idBruto)) {
    return null;
  }
  const cliente = await buscarCliente(empresaId, idBruto);
  return cliente && !cliente.arquivado_em ? cliente.id : null;
}
