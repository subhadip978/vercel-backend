import http from 'http';
import httpProxy from 'http-proxy';

const routes = new Map<string, string>();
const proxy = httpProxy.createProxyServer({});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('[Proxy] Error:', err);
  if (res && 'writeHead' in res) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});

// Create the HTTP server that intercepts requests
const server = http.createServer((req, res) => {
  const host = req.headers.host;
  if (!host) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request - Missing Host Header');
    return;
  }

  const target = routes.get(host);
  if (!target) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found - Domain not routed by Quay');
    return;
  }

  proxy.web(req, res, { target });
});

/**
 * Adds or updates a route in the routing table.
 * @param domain The domain name (e.g., app.localhost)
 * @param containerAddr The internal address of the container (e.g., http://container_name:80)
 */
export function addRoute(domain: string, containerAddr: string): void {
  routes.set(domain, containerAddr);
  console.log(`[Proxy] Added route: ${domain} -> ${containerAddr}`);
}

/**
 * Starts the proxy server.
 * @param port The port to listen on.
 */
export function startProxyServer(port: number): void {
  server.listen(port, () => {
    console.log(`[Quay] Starting Reverse Proxy on port ${port}`);
  });
}
