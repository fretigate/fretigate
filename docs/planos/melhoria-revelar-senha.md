# Plano — melhoria: revelar senha em Entrar e Criar conta

**Aprovado pelo fundador em 12/08/2026.** Commitado antes de a construção
começar, conforme o `CLAUDE.md` §2. Este arquivo é o plano de registro: se a
construção divergir dele, quem manda é o fundador, e a divergência é anotada
em `docs/diario.md`.

## Contexto

Pedido do fundador, testando o app no celular: os campos de senha de
**Entrar** e **Criar conta** precisam de um botão para visualizar a senha
digitada, e um erro de senha errada no login não deve apagar o campo — só
mostrar o erro.

A peça já existe: `src/components/ui/CampoTexto.tsx` tem a prop `revelavel`
("Mostrar"/"Ocultar"), criada junto da tela **Redefinir senha** (tarefa 8,
08/08/2026) e usada só ali até agora. É ligar uma peça existente em mais
dois lugares, não criar nada novo.

"Não apagar a senha no erro" já era o comportamento de `FormularioEntrar.tsx`
— nenhum branch de erro chamava `setSenha("")`. Confirmado por leitura, sem
mudança de código.

## O que muda

1. `src/app/(auth)/entrar/FormularioEntrar.tsx` e
   `src/app/(auth)/criar-conta/FormularioCriarConta.tsx`: acrescentar
   `revelavel` ao `CampoTexto` da senha, mesmo padrão de
   `TelaRedefinirSenha.tsx`.

2. **Conferência pedida pelo fundador antes de aprovar — virou correção
   real, não só checagem:**
   - O alvo de toque do botão "Mostrar"/"Ocultar" media 44px (variante
     "texto" do inventário), abaixo do mínimo de 48px do `CLAUDE.md` §8 —
     mesma classe do achado 10 da tarefa 2 do item 3 (o "Trocar" da data
     em Lançar frete). Corrigido só neste controle (`h-48!` em
     `CampoTexto.tsx`), sem alterar `Botao.tsx` nem os demais usos da
     variante.
   - `revelado` (o estado de "mostrando"/"ocultando") não resetava depois
     de um envio com erro, nas três telas que usam `revelavel` — inclusive
     Redefinir senha, que já tinha esse defeito antes deste pedido.
     Corrigido nas três com um contador de tentativas por formulário,
     passado como `key` do `CampoTexto` da senha, incrementado só no
     caminho de erro (nunca no sucesso, que redireciona e desmonta o
     formulário).

3. `docs/componentes.md` linhas 395/396: registrar "com revelar" no campo
   SENHA de Entrar e Criar conta.

## Verificação

- `npm run lint`, `npx tsc --noEmit`, `npm test`.
- No navegador, nas três telas (`/entrar`, `/criar-conta`,
  `/redefinir-senha`): botão aparece, mede 48px, alterna Mostrar/Ocultar, e
  volta a "Mostrar" sozinho depois de um envio com erro, sem apagar o valor
  digitado.
- `/revisar` antes do commit.
