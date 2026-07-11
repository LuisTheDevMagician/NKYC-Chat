import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { networkInterfaces } from "node:os";

// Retorna os IPs IPv4 de rede local desta máquina (ex.: 192.168.x.x). São usados em
// `allowedDevOrigins` para que o Next não bloqueie as requisições do dev server quando o
// app é aberto de outro dispositivo pelo IP da rede, em vez de por localhost.
function getLocalNetworkOrigins(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((iface): iface is NonNullable<typeof iface> => !!iface && iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);
}

// Lê o arquivo .env único na raiz do repositório (compartilhado pelos dois apps) e o
// transforma em um objeto de variáveis. O Next não carrega .env de fora do diretório do app,
// por isso fazemos essa leitura manual aqui.
function loadRootEnv(): Record<string, string> {
  try {
    const content = readFileSync(join(process.cwd(), "..", ".env"), "utf-8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;
      env[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

const rootEnv = loadRootEnv();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: rootEnv.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: rootEnv.NEXT_PUBLIC_WS_URL,
  },
  // Libera os IPs de rede local desta máquina como origens permitidas do dev server,
  // permitindo o acesso a partir de outros dispositivos na mesma rede (ex.: http://192.168.x.x:3000).
  allowedDevOrigins: getLocalNetworkOrigins(),
  // Esconde o indicador de dev na tela do Next.js (o botão "N" das devtools).
  devIndicators: false,
};

export default nextConfig;
