import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
};

export default nextConfig;
