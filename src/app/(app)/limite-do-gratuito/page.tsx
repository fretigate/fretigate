import { notFound } from "next/navigation";
import { z } from "zod";
import { exigirSessao } from "@/lib/auth/sessao";
import { CabecalhoComVoltar } from "@/components/ui/CabecalhoComVoltar";
import { Botao } from "@/components/ui/Botao";

/**
 * Limite do gratuito (item 13, Tarefa 3 — `docs/planos/
 * item-13-tarefa-3-telas-de-assinatura.md`). Genérica, parametrizada por
 * `tipo` — a Tarefa 4 (bloqueio dos limites do plano gratuito, ainda não
 * construída) manda a pessoa pra cá quando ela esbarra num teto
 * (`CLAUDE.md` §10). Nasce antes do gatilho de propósito, para a Tarefa 4
 * só precisar chamar a rota, sem decidir texto nem acesso.
 *
 * **Só dois tipos são construíveis hoje** — `CAMINHAO` e `USUARIO`
 * (`Veiculo`/`Usuario`, contagem simples por `empresa_id`). Importação fica
 * de fora: o item 15 ainda não existe, não há o que teria disparado um
 * terceiro tipo.
 *
 * **`voltar`, não um `href` fixo de volta** — quem manda a pessoa pra cá
 * (a Tarefa 4, ainda por vir) sabe de onde ela veio; esta tela não sabe,
 * porque nasce sem chamador nenhum ainda. Recebe o caminho de retorno por
 * query string, validado como caminho relativo. Sem o parâmetro (ou com
 * um valor inválido), volta pro início.
 *
 * **Validação própria, não reuso de nada existente** — `hrefVoltar` em
 * `relatorio/[id]/page.tsx` é parecido na forma (um caminho de volta
 * passado de fora), mas nunca precisou de validação: lá o valor vem do
 * banco (`relatorio.cliente_id`), nunca de entrada de quem usa. Este é o
 * primeiro "voltar" do produto com valor vindo de fora, e por isso o
 * primeiro que precisa se defender de open redirect — inclusive do truque
 * de barra invertida (`/\evil.com`), que o navegador normaliza para
 * `//evil.com` num URL de esquema especial antes mesmo de alguém checar
 * `//` literal. `voltarSeguro` normaliza `\` para `/` antes de validar,
 * pra não deixar essa forma passar disfarçada.
 *
 * **Acesso dual, decisão do fundador** — dono e operador chegam aqui: quem
 * esbarra no limite pode ser o operador tentando cadastrar o segundo
 * caminhão. Conteúdo muda por papel: dono vê "Ver os planos"; operador vê
 * "fale com o dono", sem o caminho de assinar — ele não completa a
 * assinatura, e um botão sem destino pra quem o vê é o que `CLAUDE.md` §8
 * proíbe.
 *
 * **"Ver os planos" aponta para `/planos`, que ainda não existe** —
 * decisão do fundador, item 13 Tarefa 3 parcial (09/09/2026): janela
 * curta e aceita, fecha assim que a Tarefa 3 continuar com as URLs de
 * checkout da Kiwify.
 *
 * **Textos abaixo são propostos, a confirmar com o fundador/Design.**
 */

const schemaTipo = z.enum(["CAMINHAO", "USUARIO"]);
type Tipo = z.infer<typeof schemaTipo>;

const TEXTO_POR_TIPO: Record<Tipo, string> = {
  CAMINHAO: "Você já tem 1 caminhão no plano gratuito.",
  USUARIO: "Você já tem 1 usuário no plano gratuito.",
};

function voltarSeguro(bruto: string | undefined): string {
  // Normaliza `\` para `/` antes de checar — sem isso, "/\evil.com" passa
  // (não começa literalmente com "//") e o navegador o resolve como
  // "//evil.com" na hora de navegar, escapando do produto. Achado do
  // `/revisar`, item 13 Tarefa 3 parcial.
  const normalizado = bruto?.replace(/\\/g, "/");
  if (normalizado && normalizado.startsWith("/") && !normalizado.startsWith("//")) {
    return normalizado;
  }
  return "/";
}

export default async function Pagina(props: PageProps<"/limite-do-gratuito">) {
  const sessao = await exigirSessao();
  const parametros = await props.searchParams;

  const resultadoTipo = schemaTipo.safeParse(parametros.tipo);
  if (!resultadoTipo.success) notFound();

  const voltar = voltarSeguro(
    typeof parametros.voltar === "string" ? parametros.voltar : undefined,
  );

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-24 px-20"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <CabecalhoComVoltar href={voltar} titulo="Limite do gratuito" />

      <p className="text-apoio font-medium leading-[1.5] text-tinta-apoio">
        {TEXTO_POR_TIPO[resultadoTipo.data]}
      </p>

      {sessao.papel === "dono" ? (
        <div className="flex flex-col gap-10">
          <Botao variante="principal" href="/planos">
            Ver os planos
          </Botao>
          <Botao variante="texto" href={voltar}>
            Depois
          </Botao>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <p className="text-apoio font-medium leading-[1.5] text-tinta-apoio">
            Fale com o dono da empresa para assinar e liberar mais.
          </p>
          <Botao variante="texto" href={voltar}>
            Depois
          </Botao>
        </div>
      )}
    </main>
  );
}
