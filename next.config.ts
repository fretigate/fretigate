import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * Os endereços IPv4 de verdade desta máquina na rede local — nunca um
 * padrão de texto. Achado do `/revisar`, 12/08/2026: a primeira versão
 * usava um curinga (`"192.168.*.*"`), pensando que "comparar por
 * segmento de host" (o mecanismo do Next.js,
 * `node_modules/next/dist/esm/server/app-render/csrf-protection.js`,
 * `matchWildcardDomain`) fosse mais seguro que o glob de texto livre do
 * `better-auth` corrigido ao lado (`src/lib/auth/index.ts`). Não é —
 * **os dois só comparam texto**, e um domínio de 4 partes como
 * `192.168.evil.com` (comprável por qualquer um que já tenha `evil.com`,
 * criando o subdomínio `192.168`) tem exatamente os mesmos 4 segmentos
 * que `"192.168.*.*"` espera, e batia. Curinga em texto nunca é o mesmo
 * que verificar formato — se o que importa é "isto é um endereço de rede
 * local", a única forma segura é conferir que é um endereço, não que a
 * palavra se parece com um. `allowedDevOrigins` só aceita lista estática
 * (`string[]`, sem função — diferente do `trustedOrigins` do
 * `better-auth`), então a correção é computar os endereços de verdade
 * desta máquina a cada início do servidor, nunca gravar um texto que só
 * parece um IP.
 */
function enderecosDeRedeLocal(): string[] {
  const interfaces = networkInterfaces();
  const enderecos: string[] = [];
  for (const lista of Object.values(interfaces)) {
    for (const info of lista ?? []) {
      if (info.family === "IPv4" && !info.internal) {
        enderecos.push(info.address);
      }
    }
  }
  return enderecos;
}

const nextConfig: NextConfig = {
  // Permite testar em `npm run dev -- -H 0.0.0.0` a partir de qualquer
  // aparelho na rede local (celular, por exemplo): sem isso, o Next.js
  // bloqueia por padrão os recursos de desenvolvimento (JS, HMR) para
  // qualquer origem que não seja localhost — silenciosamente do ponto de
  // vista de quem usa o app, só um aviso no terminal do servidor. Isso
  // quebrava interações que dependem de JavaScript (chips de escolha,
  // envio de formulário) mesmo com a página carregando normalmente.
  //
  // Endereço calculado, não um padrão de texto nem um valor fixo —
  // decisão do fundador, 12/08/2026: "configuração de ambiente dentro do
  // repositório é o que o .env existe para evitar", e um IP fixo
  // quebraria ao trocar de rede (ou apontaria para o lugar errado na
  // máquina de outra pessoa). Só vale em desenvolvimento; o servidor de
  // desenvolvimento nunca vai ao ar.
  allowedDevOrigins:
    process.env.NODE_ENV === "development" ? enderecosDeRedeLocal() : undefined,
};

export default nextConfig;
