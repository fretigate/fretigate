import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite testar em `npm run dev -- -H 0.0.0.0` a partir de qualquer
  // aparelho na rede local (celular, por exemplo): sem isso, o Next.js
  // bloqueia por padrão os recursos de desenvolvimento (JS, HMR) para
  // qualquer origem que não seja localhost — silenciosamente do ponto de
  // vista de quem usa o app, só um aviso no terminal do servidor. Isso
  // quebrava interações que dependem de JavaScript (chips de escolha,
  // envio de formulário) mesmo com a página carregando normalmente.
  //
  // Padrão de faixa privada (RFC 1918), não um endereço fixo — decisão do
  // fundador, 12/08/2026: "configuração de ambiente dentro do repositório
  // é o que o .env existe para evitar", e um IP fixo quebraria ao trocar
  // de rede (ou apontaria para o lugar errado na máquina de outra
  // pessoa). Sem risco de abrir demais: o mecanismo de correspondência do
  // Next.js (`isCsrfOriginAllowed`) recusa um curinga solto tipo `"*"` de
  // propósito, e compara o cabeçalho Origin de verdade da página — um
  // site malicioso não consegue forjar "vim de 192.168.x.x", só reflete
  // de onde ele carregou de fato. Só vale em desenvolvimento; o servidor
  // de desenvolvimento nunca vai ao ar.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
