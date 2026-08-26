import { NextResponse } from "next/server";
import { z } from "zod";
import { exigirSessao, SemSessao } from "@/lib/auth/sessao";
import {
  enviarComprovante,
  MENSAGENS_SEGURAS_DE_COMPROVANTE,
  TAMANHO_MAXIMO_COMPROVANTE_BYTES,
} from "@/lib/servicos/comprovantes";
import { travaDeUploadDeComprovante } from "@/lib/servicos/trava-de-comprovante";
import { formatarHorarioFortaleza } from "@/lib/utils/mensagem-trava";

/**
 * Upload do comprovante (item 5, Tarefa 5 —
 * `docs/planos/item-5-ordem-de-servico.md`). Rota de API, não Server
 * Action: o corpo de um arquivo de imagem passa fácil do limite padrão de
 * 1 MB das Server Actions do Next.js, e — mais importante — uma Server
 * Action só entrega o `FormData` já lido inteiro; não dá para olhar o
 * tamanho do pedido ANTES de ler o arquivo para memória, que é exatamente o
 * primeiro passo do pipeline (`CLAUDE.md` §4, "Upload de imagem"). Uma rota
 * de API dá acesso ao `Request` cru, com o cabeçalho `Content-Length` — só
 * depois de conferir que ele não passa do teto é que `request.formData()`
 * roda.
 *
 * Por não ser Server Action, esta rota fica fora do alcance do envelope
 * `comoUsuario`/`comoDono` (`src/lib/auth/acao.ts`, que só embrulha ações
 * com `"use server"`) e de `tests/protecao-de-acoes.test.ts`, que só varre
 * esse tipo de arquivo — a checagem de sessão abaixo é feita à mão, do
 * mesmo jeito que `exigirSessao` já é chamada em toda Server Component
 * (ela só lê `next/headers()`, funciona em qualquer contexto de pedido).
 */

const schemaId = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let sessao;
  try {
    sessao = await exigirSessao();
  } catch (erro) {
    if (erro instanceof SemSessao) {
      return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });
    }
    throw erro;
  }

  const { id } = await params;
  const idValidado = schemaId.safeParse(id);
  if (!idValidado.success) {
    return NextResponse.json({ erro: "Frete inválido." }, { status: 400 });
  }

  const trava = await travaDeUploadDeComprovante();
  if (!trava.permitido) {
    // As três exigências de `docs/especificacao.md` § "Trava de tentativas"
    // — o que aconteceu, QUANDO pode tentar de novo, e uma saída quando
    // existir uma diferente de esperar. Aqui não existe saída diferente
    // (mesmo caso de "Mandar link de recuperação" naquela tabela: quem
    // travou aqui já está dentro do próprio fluxo de anexar comprovante).
    // "A foto continua na galeria" — mais preciso que "não foi perdida"
    // (achado do quarto passe do `/revisar`): `AnexarComprovante.tsx` limpa
    // a seleção do `<input>` a cada tentativa (`evento.target.value = ""`,
    // mesmo numa que travou), então a pessoa PRECISA escolher a foto de
    // novo — "não foi perdida" sozinho lia como "já está garantida", o que
    // não é o caso.
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return NextResponse.json(
      {
        erro:
          `Muitos envios seguidos por aqui. A foto continua na galeria — ` +
          `escolhe ela de novo e tenta às ${horario}.`,
      },
      { status: 429 },
    );
  }

  // Passo 1 do pipeline: rejeita pelo TAMANHO DECLARADO DO PEDIDO, antes de
  // chamar `request.formData()` — que é quem, de fato, leria o arquivo
  // inteiro para a memória do processo. Cabeçalho ausente, vazio, negativo
  // ou ilegível NUNCA é lido como "dentro do limite" — achado do `/revisar`,
  // corrigido duas vezes: a primeira versão fazia `Number(null ?? "")`, que
  // vira `0` e passava; a correção seguinte trocou por `Number.isFinite`,
  // mas `Number("")` e `Number("-1")` TAMBÉM são finitos — ainda passavam.
  // A checagem certa é de FORMATO, não só de valor: só dígitos (o formato
  // que o cabeçalho `Content-Length` sempre tem), nada mais. Sem o
  // cabeçalho, ou com um valor que não bate esse formato, não dá para saber
  // o tamanho antes de ler — e "não sei" não é "está dentro do limite", a
  // mesma lição do §9 sobre contexto ausente.
  const cabecalhoTamanho = request.headers.get("content-length");
  const tamanhoValido = cabecalhoTamanho !== null && /^\d+$/.test(cabecalhoTamanho);
  if (!tamanhoValido || Number(cabecalhoTamanho) > TAMANHO_MAXIMO_COMPROVANTE_BYTES) {
    return NextResponse.json({ erro: "O arquivo passa de 10 MB." }, { status: 413 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Envie um arquivo." }, { status: 400 });
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  try {
    await enviarComprovante(sessao.empresaId, idValidado.data, buffer);
  } catch (erro) {
    // Só repassa mensagem da LISTA CONHECIDA (`MENSAGENS_SEGURAS_DE_COMPROVANTE`,
    // `comprovantes.ts`) — achado do quinto passe do `/revisar`: `erro
    // instanceof Error ? erro.message : "..."` (o padrão do resto do
    // produto) deixava passar o texto cru do `sharp` estourando
    // `limitInputPixels` ou do Prisma, os dois em inglês/jargão técnico
    // (`CLAUDE.md` §8, "Vocabulário do usuário"). Qualquer coisa fora da
    // lista vira a mesma mensagem genérica de sempre.
    const mensagemConhecida =
      erro instanceof Error && MENSAGENS_SEGURAS_DE_COMPROVANTE.has(erro.message)
        ? erro.message
        : null;
    if (!mensagemConhecida) console.error("[comprovante/route] erro inesperado", erro);
    return NextResponse.json({ erro: mensagemConhecida ?? "Não deu para enviar agora." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
