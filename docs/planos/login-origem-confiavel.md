# Plano — login pelo celular sendo recusado (origem não confiável)

**Aprovado pelo fundador em 12/08/2026.** Commitado antes de a construção
começar, conforme o `CLAUDE.md` §2. Este arquivo é o plano de registro: se a
construção divergir dele, quem manda é o fundador, e a divergência é anotada
em `docs/diario.md`.

## Contexto

O fundador reportou erro genérico ao errar a senha em `/entrar`, testando
pelo celular. A investigação inicial (mensagem de erro) foi corrigida pelo
próprio fundador: o problema real era a **tentativa de login sendo
barrada**, não a mensagem.

Confirmado por leitura do código-fonte instalado
(`node_modules\better-auth`): o `better-auth` valida o cabeçalho `Origin`
de todo `POST` — inclusive `/sign-in/email`, mesmo sem cookie de sessão —
contra uma lista de origens confiáveis. Mecanismo **separado** do
`allowedDevOrigins` do Next.js (aquele só protege `/_next/*`). Por padrão,
a única origem confiável é o `baseURL` (`NEXT_PUBLIC_APP_URL`, no `.env`:
`http://localhost:3000`) — um login pelo celular (origem
`http://192.168.x.x:3000`) bate em `403 INVALID_ORIGIN` antes mesmo de
conferir a senha.

## O que muda

1. **`src/lib/auth/index.ts`** — acrescentar `trustedOrigins` ao
   `betterAuth({...})`, com o mesmo padrão de faixa privada já usado em
   `next.config.ts` (`allowedDevOrigins`) — sem IP fixo, mesma razão:
   "configuração de ambiente dentro do repositório é o que o `.env` existe
   para evitar", e um IP fixo quebra ao trocar de rede:

   ```ts
   trustedOrigins:
     process.env.NODE_ENV === "development"
       ? ["http://192.168.*.*:3000", "http://10.*.*.*:3000"]
       : undefined,
   ```

   Só em desenvolvimento — `trustedOrigins` é configuração geral do
   `better-auth`, não algo dev-only por natureza como o `allowedDevOrigins`
   do próprio Next.js.

2. **Reforço de robustez no tratamento de erro** — `src/lib/auth/
   cliente.ts` cria o `authClient` sem `catchAllError`, então uma falha de
   rede de verdade faz `authClient.signIn.email(...)` lançar exceção em
   vez de devolver `{error}`, e nem `FormularioEntrar.tsx` nem
   `TelaRedefinirSenha.tsx` têm `try`/`catch`. Acrescentar `try`/`catch`
   nos três pontos de chamada, com mensagem própria ("Sem conexão com o
   servidor..."). Também tornar o reconhecimento de credencial errada mais
   resistente: checar `error.status === 401` além do `error.code`
   exato.

3. **`INVALID_ORIGIN` ganha caso próprio no tratamento de erro** — não
   muda o texto (continua genérico), mas registra em `console.error`,
   citando o que conferir, para não ficar invisível de novo.

4. **`CLAUDE.md` §14** — acrescentar à pendência "CONFERIR ANTES DE
   PUBLICAR — variáveis de ambiente na Vercel" o sintoma específico: login
   que não entra, mensagem genérica, credencial correta → conferir
   `NEXT_PUBLIC_APP_URL`.

## Verificação

1. `npm run lint`, `npx tsc --noEmit`, `npm test`.
2. Testar login pelo celular com a senha certa — confirmar que entra.
   Depois com senha errada — confirmar "E-mail ou senha incorretos.".
3. Confirmar que login pelo `localhost:3000` continua funcionando.
4. Forçar `INVALID_ORIGIN` de propósito e confirmar que o `console.error`
   identificável aparece, com o texto visível continuando genérico.
5. `/revisar` antes do commit.

## Arquivos

- `src/lib/auth/index.ts` (a correção principal)
- `src/app/(auth)/entrar/FormularioEntrar.tsx`
- `src/app/(auth)/redefinir-senha/TelaRedefinirSenha.tsx`
- `CLAUDE.md` §14 (sintoma acrescentado à pendência já existente)
