import type { TipoVeiculo } from "@/lib/generated/prisma/client";

/**
 * O nome do caminhão — jeito único de dizer quem ele é, usado no aviso, na
 * linha da lista, no cabeçalho do perfil e (no item 3) no filtro de fretes.
 *
 * Caminhão pode ser cadastrado só com placa (`docs/especificacao.md`,
 * entidade Veiculo — só apelido OU placa é obrigatório). Sem esta função,
 * um caminhão cadastrado só com placa apareceria sem nome em toda lista.
 */
export function nomeCaminhao(veiculo: { apelido: string | null; placa: string | null }): string {
  return veiculo.apelido || veiculo.placa!.toUpperCase();
}

/**
 * `docs/especificacao.md`, entidade Veiculo — chip de escolha única, cinco
 * valores. Campo opcional: nada no MVP consome `tipo` hoje.
 *
 * Vive aqui, e não em `src/lib/servicos/caminhoes.ts`, porque
 * `FormularioCaminhao.tsx` ("use client") precisa dela — e aquele arquivo
 * importa `db`, que puxa `pg` para o bundle do navegador. Este arquivo não
 * tem acesso a dado nenhum, só valores puros; é seguro para os dois lados.
 */
export const TIPOS_VEICULO: { valor: TipoVeiculo; rotulo: string }[] = [
  { valor: "toco", rotulo: "Toco" },
  { valor: "truck", rotulo: "Truck" },
  { valor: "bitruck", rotulo: "Bitruck" },
  { valor: "carreta", rotulo: "Carreta" },
  { valor: "bitrem", rotulo: "Bitrem" },
];
