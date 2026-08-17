import Image from "next/image";

// A marca no topo das telas de fora de sessão — Entrar, Criar conta, Esqueci
// a senha, Redefinir senha e Termos (modo cadastro). Quem chega por anúncio
// decide confiar no produto nessas telas, e elas são o único lugar onde a
// marca pode se apresentar: a venda é autoatendida, sem vendedor e sem
// demonstração (CLAUDE.md §1).
//
// PROVISÓRIO. Decisão de tela é do Design (CLAUDE.md §13). Nenhum dos três
// valores é formal de docs/estilo.md — estão lá como lacuna aberta:
//
// - largura 140px;
// - distância até o título: 140px em Entrar, Criar conta, Esqueci a senha e
//   Redefinir senha (`Marca` padrão), 16px só em Termos (`Marca compacta`) —
//   valor medido no próprio mockup do Design, não no texto dele, que erra ao
//   afirmar 140px para as cinco (docs/estilo.md § Espaçamento tem a nota
//   completa da contradição);
// - respiro do topo, 66px, sem mudança — confirmado pelo fundador em
//   14/08/2026.
//
// A folga abaixo da marca vive neste componente, não em cada página — com
// cinco telas usando a mesma marca, é aqui que cada valor existe uma vez só
// (§8), mesmo que a convenção das telas de auth ponha a folga no elemento
// seguinte. Cuidado: aqui `--spacing: 1px`, então `mb-140`/`mb-16` são
// pixels literais, não a escala padrão do Tailwind.
//
// Variante colorida (verde escuro + verde rodovia) sobre o papel #FAF8F4 —
// contraste de sobra. A branca é a de fundo escuro e não serve em nenhuma das
// cinco. A marca entra como imagem, não como cor escrita em CSS, então nenhum
// hex novo passa a existir no código: o #0C311B do verde escuro não está em
// docs/estilo.md e não precisa estar enquanto for arquivo. Se um dia virar
// SVG inline, aí sim ele precisa ser formalizado antes.
//
// `public/marca/fretigate.png` é cópia de `referencia/marca/LOGOMARCA
// colorida sem fundo.png` — cópia, e não import de lá, porque
// `referencia/LEIA-ME.md` diz que nada daquela pasta é importado por `src/`.
//
// Primeiro uso de `next/image` no projeto, sem precedente para seguir. As
// dimensões intrínsecas (1920×394) reservam o espaço antes de a imagem
// chegar, então o título não pula; `priority` evita o piscar, porque a marca
// está acima da dobra na primeira tela que a pessoa vê.
export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className={compacta ? "mb-16 flex justify-center" : "mb-140 flex justify-center"}>
      <Image
        src="/marca/fretigate.png"
        alt="FretiGate"
        width={1920}
        height={394}
        sizes="140px"
        priority
        className="h-auto w-[140px]"
      />
    </div>
  );
}
