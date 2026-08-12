"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { ChipEscolha } from "@/components/ui/ChipEscolha";
import { FolhaInferior } from "@/components/ui/FolhaInferior";
import { TIPOS_VEICULO } from "@/lib/utils/caminhao";
import type { TipoVeiculo } from "@/lib/generated/prisma/client";
import {
  criarCaminhaoRapidoAction,
  criarClienteRapidoAction,
  criarMotoristaRapidoAction,
  type ResultadoRapido,
} from "./acoes";

/**
 * Cadastro rápido — `docs/componentes.md` §11: folha curta que abre pelo
 * "+ Novo"/"+ Cadastrar" da Folha de busca, durante o Lançamento de frete.
 * Só o nome/apelido é obrigatório. Ao salvar, fecha a folha de busca junto
 * ("quem tocou em '+ Novo' queria voltar ao lançamento, não à lista") — quem
 * chama (`TelaLancarFrete`) faz isso via `onCriado`.
 *
 * Chamada direta ao servidor (não `useActionState`/`FormData`): o resultado
 * precisa voltar para dentro da mesma tela, sem navegar.
 */

export type TipoCadastroRapido = "cliente" | "caminhao" | "motorista";

const TITULOS: Record<TipoCadastroRapido, string> = {
  cliente: "Novo cliente",
  caminhao: "Novo caminhão",
  motorista: "Novo motorista",
};

type Props = {
  tipo: TipoCadastroRapido;
  nomeInicial: string;
  onCriado: (item: { id: string; nome: string; apoio?: string }) => void;
  onCancelar: () => void;
};

export function CadastroRapido({ tipo, nomeInicial, onCriado, onCancelar }: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState("");
  const [placa, setPlaca] = useState("");
  const [prazoPagamentoDias, setPrazoPagamentoDias] = useState("");
  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo | "">("");
  const [erro, setErro] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    setErro(undefined);

    let resultado: ResultadoRapido;
    if (tipo === "cliente") {
      const prazo = prazoPagamentoDias.trim() ? Number(prazoPagamentoDias) : null;
      resultado = await criarClienteRapidoAction(nome, telefone, prazo);
    } else if (tipo === "caminhao") {
      resultado = await criarCaminhaoRapidoAction(nome, placa, tipoVeiculo);
    } else {
      resultado = await criarMotoristaRapidoAction(nome, telefone);
    }

    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onCriado(resultado.item);
  }

  const nomeVazio = nome.trim().length === 0;

  return (
    <FolhaInferior titulo={TITULOS[tipo]} onFechar={onCancelar}>
      <div className="flex flex-col gap-6">
        <CampoTexto
          rotulo={tipo === "caminhao" ? "Apelido" : "Nome"}
          placeholder={
            tipo === "cliente"
              ? "Como você chama esse cliente"
              : tipo === "caminhao"
                ? "Como você chama esse caminhão"
                : "Como você chama esse motorista"
          }
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          autoFocus
        />

        {tipo === "caminhao" ? (
          <CampoTexto
            rotulo="Placa"
            placeholder="ABC-1D23"
            value={placa}
            onChange={(evento) => setPlaca(evento.target.value)}
          />
        ) : (
          <CampoTexto
            rotulo="Telefone"
            type="tel"
            placeholder="Com DDD"
            value={telefone}
            onChange={(evento) => setTelefone(evento.target.value)}
          />
        )}

        {tipo === "cliente" ? (
          <CampoTexto
            rotulo="Prazo de pagamento"
            type="number"
            inputMode="numeric"
            placeholder="Em dias — vazio herda o padrão da empresa"
            value={prazoPagamentoDias}
            onChange={(evento) => setPrazoPagamentoDias(evento.target.value)}
          />
        ) : null}
      </div>

      {tipo === "caminhao" ? (
        <div role="radiogroup" aria-label="Tipo do caminhão" className="flex flex-wrap gap-8">
          {TIPOS_VEICULO.map((opcao) => (
            <ChipEscolha
              key={opcao.valor}
              selecionado={tipoVeiculo === opcao.valor}
              onClick={() =>
                setTipoVeiculo((atual) => (atual === opcao.valor ? "" : opcao.valor))
              }
            >
              {opcao.rotulo}
            </ChipEscolha>
          ))}
        </div>
      ) : null}

      {erro ? <span className="text-apoio font-medium text-vencido">{erro}</span> : null}

      <Botao variante="principal" carregando={salvando} disabled={nomeVazio} onClick={salvar}>
        Cadastrar e usar
      </Botao>
      <Botao variante="texto" onClick={onCancelar}>
        Cancelar
      </Botao>
    </FolhaInferior>
  );
}
