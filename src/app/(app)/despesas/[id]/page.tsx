import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { buscarDespesa } from "@/lib/servicos/despesas";
import { listarCaminhoes } from "@/lib/servicos/caminhoes";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { FormularioDespesa } from "../FormularioDespesa";

/**
 * Edição de despesa — `docs/navegacao.md` linha 59: "Linha → edição". Sem
 * perfil intermediário: a linha da lista abre direto no formulário.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const [despesa, caminhoes] = await Promise.all([
    buscarDespesa(sessao.empresaId, id),
    listarCaminhoes(sessao.empresaId),
  ]);
  if (!despesa) notFound();

  return (
    <FormularioDespesa
      hoje={diaEmFortaleza(new Date())}
      caminhoes={caminhoes.map((c) => ({ id: c.id, apelido: c.apelido, placa: c.placa }))}
      despesa={{
        id: despesa.id,
        data: diaEmFortaleza(despesa.data),
        categoria: despesa.categoria,
        valorCentavos: despesa.valor,
        descricao: despesa.descricao,
        veiculoId: despesa.veiculo_id,
      }}
    />
  );
}
