import { notFound } from "next/navigation";
import { exigirDono, SemPermissao } from "@/lib/auth/sessao";
import { buscarEmpresa } from "@/lib/servicos/empresas";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { FormularioConvite } from "./FormularioConvite";

/**
 * Usuários — convite (item 10, Tarefa 4). `docs/componentes.md`: "principal
 * Mandar convite no WhatsApp · prévia da mensagem". Sempre cria papel
 * `operador` — o formulário nunca pede papel (decisão 6 da Tarefa 1).
 */
export default async function Pagina() {
  let sessao;
  try {
    sessao = await exigirDono();
  } catch (erro) {
    if (erro instanceof SemPermissao) notFound();
    throw erro;
  }

  const empresa = await buscarEmpresa(sessao.empresaId);
  if (!empresa) notFound();

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div
        className="flex items-center gap-10 px-20 pb-14"
        style={{ paddingTop: "var(--area-segura-topo)" }}
      >
        <BotaoVoltar href="/conta/usuarios" />
        <span
          className="min-w-0 flex-1 text-titulo-modelo font-extrabold tracking-[-0.015em] text-tinta"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Convidar
        </span>
      </div>

      <div className="flex flex-col px-20">
        <FormularioConvite empresaNome={empresa.nome_fantasia ?? ""} />
      </div>
    </main>
  );
}
