/**
 * Resolve a URL do backend (API ou WebSocket) levando em conta de onde a página foi aberta.
 *
 * Em dev, o `.env` aponta a API/WS para `localhost`. Esse valor fica embutido no bundle do
 * cliente. O problema: quando o app é aberto de outro dispositivo pelo IP da rede
 * (ex.: um celular acessando `http://192.168.x.x:3000`), o `localhost` passa a significar o
 * *próprio celular* — então as requisições nunca chegam à máquina de desenvolvimento.
 *
 * Solução: no navegador, se a URL configurada aponta para localhost mas a página está sendo
 * vista a partir de outro host, reescrevemos apenas o host (mantendo porta e caminho) para o
 * mesmo host da página. Assim, tanto o acesso por `localhost` quanto por IP de rede funcionam,
 * sem IP fixo no código. Quando a URL configurada NÃO é localhost (ex.: um domínio real em
 * produção), ela é respeitada como está.
 */
export function resolveBackendUrl(configured: string): string {
  if (typeof window === "undefined") return configured;
  try {
    const url = new URL(configured);
    const configIsLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const pageHost = window.location.hostname;
    const pageIsLoopback = pageHost === "localhost" || pageHost === "127.0.0.1";

    if (configIsLoopback && !pageIsLoopback) {
      url.hostname = pageHost;
    }
    // `toString()` acrescenta uma barra final quando não há caminho; removemos para que os
    // callers possam concatenar rotas ("/auth/register") sem gerar barras duplicadas.
    return url.toString().replace(/\/$/, "");
  } catch {
    return configured;
  }
}
