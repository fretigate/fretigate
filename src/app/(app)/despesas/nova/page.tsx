import { exigirSessao } from "@/lib/auth/sessao";
import { listarCaminhoes } from "@/lib/servicos/caminhoes";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { FormularioDespesa } from "../FormularioDespesa";

/**
 * Cadastro de despesa — `docs/navegacao.md` linha 47: chega de "Mais" e do
 * card de Lucro da dashboard em estado de convite.
 */
export default async function Pagina() {
  const sessao = await exigirSessao();
  const caminhoes = await listarCaminhoes(sessao.empresaId);

  return (
    <FormularioDespesa
      hoje={diaEmFortaleza(new Date())}
      caminhoes={caminhoes.map((c) => ({ id: c.id, apelido: c.apelido, placa: c.placa }))}
    />
  );
}
