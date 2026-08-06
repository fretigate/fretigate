// TEMPORÁRIO — sai na tarefa 8, quando a tela de Entrar existir.
// Serve para uma coisa só: confirmar de olho que a instalação subiu com o
// papel, as tintas, os raios e as duas fontes de docs/estilo.md.
export default function Home() {
  return (
    <main
      className="flex min-h-full flex-col gap-24 px-20"
      style={{ paddingTop: "var(--area-segura-topo)" }}
    >
      <div className="flex flex-col gap-6">
        <p className="text-eyebrow font-bold tracking-[0.16em] text-tinta-apoio uppercase">
          Instalação
        </p>
        <h1 className="text-nome-destaque font-extrabold text-tinta">
          FretiGate
        </h1>
        <p className="text-apoio font-medium text-tinta-apoio-forte">
          Next.js, TypeScript e Tailwind no ar. Sem banco, sem login e sem tela
          de verdade ainda.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <div className="rounded-linha bg-separacao p-16">
          <p className="text-nome-linha font-bold text-tinta">
            Superfície clara
          </p>
          <p className="text-apoio text-tinta-apoio">Dado do usuário</p>
        </div>

        <div className="rounded-cartao-escuro bg-tinta p-16">
          <p className="text-nome-linha font-bold text-white">
            Superfície escura
          </p>
          <p className="text-apoio text-white/60">Mensagem do sistema</p>
          <p className="text-placa mt-8 font-mono tracking-[0.06em] text-white">
            ABC1D23
          </p>
        </div>

        <div className="rounded-pastilha bg-fretinews-fundo p-16">
          <p className="text-nome-linha font-bold text-fretinews-titulo">
            Superfície lilás
          </p>
          <p className="text-apoio text-fretinews-apoio">
            Comunicação da plataforma
          </p>
        </div>
      </div>

      <div className="rounded-pilula bg-acao flex h-60 items-center justify-center">
        <span className="text-botao-principal font-bold text-white">
          Verde de ação
        </span>
      </div>
    </main>
  );
}
