import Image from "next/image";

// A marca no topo das telas de fora de sessão — Entrar, Criar conta, Esqueci
// a senha, Redefinir senha e Termos (modo cadastro). Quem chega por anúncio
// decide confiar no produto nessas telas, e elas são o único lugar onde a
// marca pode se apresentar: a venda é autoatendida, sem vendedor e sem
// demonstração (CLAUDE.md §1).
//
// PROVISÓRIO. Decisão de tela é do Design (CLAUDE.md §13), e a largura de
// 140px veio do documento dele marcado como "aproximação não confirmada" —
// NÃO é valor formal de docs/estilo.md. Está registrada lá como lacuna
// aberta, junto do resto que falta ele definir.
//
// Os 24px até o título têm lastro: estão na escala de espaçamento e dentro de
// "entre seções verticais: 22–26px" (docs/estilo.md § Espaçamento). Cuidado:
// aqui `--spacing: 1px`, então `mb-24` é 24px literais, não o Tailwind
// padrão. A folga vive neste componente e não em cada página — com cinco
// telas usando a mesma marca, é aqui que o valor existe uma vez só (§8),
// mesmo que a convenção das telas de auth ponha a folga no elemento seguinte.
//
// O respiro do topo não muda: a marca entra dentro dos 66px de área segura
// que toda tela já reserva (docs/estilo.md § Área segura, valor único), e o
// conteúdo desce a partir dela. Confirmado pelo fundador em 14/08/2026.
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
export function Marca() {
  return (
    <div className="mb-24 flex justify-center">
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
