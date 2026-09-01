import { NextResponse } from "next/server";
import { exigirDono, SemPermissao, SemSessao } from "@/lib/auth/sessao";
import { enviarLogo, MENSAGENS_SEGURAS_DE_LOGO, TAMANHO_MAXIMO_LOGO_BYTES } from "@/lib/servicos/logo";
import { travaDeUploadDeLogo } from "@/lib/servicos/trava-de-logo";
import { formatarHorarioFortaleza } from "@/lib/utils/mensagem-trava";

/**
 * Upload da logo da empresa (item 10, Tarefa 2). Rota de API, não Server
 * Action — mesmo motivo de `src/app/api/fretes/[id]/comprovante/route.ts`:
 * precisa do `Content-Length` do pedido ANTES de ler o arquivo para
 * memória, e o corpo passa fácil do limite padrão de 1 MB de uma Server
 * Action.
 *
 * `exigirDono()` escrito à mão, não `comoDono` — mesma lacuna já registrada
 * em `CLAUDE.md` §9 sobre rota de API não ter a trava automática que Server
 * Action tem (`comoUsuario`/`comoDono` só embrulham `"use server"`). Recusa
 * SessSessao (401) separado de SemPermissao (403, sessão existe mas não é
 * dono) — mesma distinção que `exigirDono()` já expõe para a tela chamar.
 *
 * `travaDeUploadDeLogo()` — achado do `/revisar`: a primeira versão desta
 * rota não tinha trava nenhuma, contra `CLAUDE.md` §4 ("rate limit em...
 * toda rota que gere custo") — mesmo perfil de custo por requisição do
 * comprovante (decodifica, redimensiona, recomprime, grava no storage).
 * Número (20 por 5 minutos) confirmado pelo fundador, 01/09/2026 — ver
 * `docs/especificacao.md` § "Trava de tentativas".
 *
 * **A mensagem reforça que a logo atual não mudou**, não só "espere" —
 * mesmo padrão de "Enviar comprovante" ("a foto continua na galeria"),
 * pedido explícito do fundador ao confirmar o número: logo é trocada rara
 * vezes, então quem esbarra nesta trava provavelmente está tentando de
 * novo porque algo deu errado, não por uso normal — a mensagem não pode
 * deixar a dúvida de "será que a logo sumiu?" somar à frustração.
 */
export async function POST(request: Request) {
  let sessao;
  try {
    sessao = await exigirDono();
  } catch (erro) {
    if (erro instanceof SemSessao) {
      return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });
    }
    if (erro instanceof SemPermissao) {
      return NextResponse.json({ erro: "Só o dono da empresa pode trocar a logo." }, { status: 403 });
    }
    throw erro;
  }

  const trava = await travaDeUploadDeLogo();
  if (!trava.permitido) {
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return NextResponse.json(
      {
        erro:
          `Muitos envios seguidos por aqui. A logo da empresa continua a mesma — ` +
          `tenta de novo às ${horario}.`,
      },
      { status: 429 },
    );
  }

  // Mesmo passo 1 do pipeline de `comprovante/route.ts`: rejeita pelo
  // TAMANHO DECLARADO DO PEDIDO, só dígitos no cabeçalho — cabeçalho
  // ausente, vazio ou ilegível nunca é lido como "dentro do limite".
  const cabecalhoTamanho = request.headers.get("content-length");
  const tamanhoValido = cabecalhoTamanho !== null && /^\d+$/.test(cabecalhoTamanho);
  if (!tamanhoValido || Number(cabecalhoTamanho) > TAMANHO_MAXIMO_LOGO_BYTES) {
    return NextResponse.json({ erro: "O arquivo passa de 10 MB." }, { status: 413 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Envie um arquivo." }, { status: 400 });
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  try {
    await enviarLogo(sessao.empresaId, buffer);
  } catch (erro) {
    // Só repassa mensagem da LISTA CONHECIDA — mesmo padrão de
    // `comprovante/route.ts`: o `sharp`/Prisma lançam as próprias frases, em
    // inglês/jargão, que não podem chegar cru à tela (`CLAUDE.md` §8).
    const mensagemConhecida =
      erro instanceof Error && MENSAGENS_SEGURAS_DE_LOGO.has(erro.message) ? erro.message : null;
    if (!mensagemConhecida) console.error("[conta/logo/route] erro inesperado", erro);
    return NextResponse.json({ erro: mensagemConhecida ?? "Não deu para enviar agora." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
