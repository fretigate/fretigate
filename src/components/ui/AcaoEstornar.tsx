"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "./Botao";
import { FolhaDeEstorno } from "./FolhaDeEstorno";

/**
 * "Estornar cobrança" — texto destrutiva no fim do bloco de ações do
 * detalhe da cobrança (item 6, Tarefa 6), mesmo lugar de "Arquivar frete"/
 * "Arquivar cliente" (`docs/componentes.md`, linha da Detalhe da cobrança).
 * Abre `FolhaDeEstorno` para confirmar — diferente de Arquivar, que age
 * direto — antes de chamar o servidor.
 *
 * **Redireciona para `/cobrancas` no sucesso, sem ficar na própria
 * página.** O título estornado deixa de ser uma cobrança em circulação
 * (`estornarTitulo`, `src/lib/servicos/titulos.ts`) e o detalhe passa a
 * devolver 404 para ele — ficar aqui e só `router.refresh()` (o padrão de
 * `AcaoMarcarRecebido`, usado quando a tela continua fazendo sentido depois
 * da ação) bateria de frente com essa página desaparecendo. Por isso
 * `router.push`, não `router.refresh()` — mecanismo diferente do de
 * "Arquivar frete" (`arquivarServicoAction`, que chama `redirect()` **no
 * servidor**, dentro da própria Server Action, porque é um `<form>` sem
 * confirmação antes); aqui a navegação só pode ser decidida no cliente,
 * depois do `await` na Promise que a folha chama. Sem aviso de sucesso à
 * parte — igual a Arquivar, que também não mostra um.
 */

type Props = {
  tituloId: string;
  /** Recebido > 0 no título — a folha só mostra a segunda consequência quando `true`. */
  jaRecebeuAlgo: boolean;
  estornar: (tituloId: string) => Promise<{ ok: true } | { ok: false; erro: string }>;
};

export function AcaoEstornar({ tituloId, jaRecebeuAlgo, estornar }: Props) {
  const router = useRouter();
  const [folhaAberta, setFolhaAberta] = useState(false);

  return (
    <>
      <Botao
        variante="texto"
        destrutiva
        className="self-stretch"
        onClick={() => setFolhaAberta(true)}
      >
        Estornar cobrança
      </Botao>

      {folhaAberta ? (
        <FolhaDeEstorno
          jaRecebeuAlgo={jaRecebeuAlgo}
          onFechar={() => setFolhaAberta(false)}
          onEstornar={async () => {
            try {
              const resultado = await estornar(tituloId);
              if (!resultado.ok) return resultado;
              router.push("/cobrancas");
              return { ok: true as const };
            } catch {
              return { ok: false as const, erro: "Não deu para estornar agora." };
            }
          }}
        />
      ) : null}
    </>
  );
}
