import { describe, expect, it, afterEach } from "bun:test";
import { resolveBackendUrl } from "./backend-url";

// Simula a página sendo aberta a partir de um determinado host (localhost, IP de rede, etc.).
function setPageHost(hostname: string | null) {
  if (hostname === null) {
    delete (globalThis as { window?: unknown }).window;
    return;
  }
  (globalThis as { window?: unknown }).window = { location: { hostname } };
}

afterEach(() => setPageHost(null));

describe("resolveBackendUrl", () => {
  it("mantém localhost quando a página também está em localhost (desktop)", () => {
    setPageHost("localhost");
    expect(resolveBackendUrl("http://localhost:3001")).toBe("http://localhost:3001");
    expect(resolveBackendUrl("ws://localhost:3001/ws")).toBe("ws://localhost:3001/ws");
  });

  it("reescreve o host para o IP da rede quando a página é aberta por outro dispositivo (celular)", () => {
    setPageHost("192.168.31.232");
    // É esta reescrita que faz o cadastro/login do celular chegarem à máquina de dev,
    // em vez de baterem no próprio localhost do celular.
    expect(resolveBackendUrl("http://localhost:3001")).toBe("http://192.168.31.232:3001");
    expect(resolveBackendUrl("ws://localhost:3001/ws")).toBe("ws://192.168.31.232:3001/ws");
  });

  it("preserva a porta e o caminho, trocando só o host", () => {
    setPageHost("10.0.0.5");
    expect(resolveBackendUrl("ws://127.0.0.1:3001/ws")).toBe("ws://10.0.0.5:3001/ws");
  });

  it("respeita uma URL não-localhost (ex.: domínio de produção)", () => {
    setPageHost("192.168.31.232");
    expect(resolveBackendUrl("https://api.exemplo.com")).toBe("https://api.exemplo.com");
  });

  it("no servidor (sem window) devolve a URL configurada sem alterar", () => {
    setPageHost(null);
    expect(resolveBackendUrl("http://localhost:3001")).toBe("http://localhost:3001");
  });
});
