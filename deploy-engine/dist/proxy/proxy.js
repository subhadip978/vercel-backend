"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = addRoute;
exports.startProxyServer = startProxyServer;
const http_1 = __importDefault(require("http"));
const http_proxy_1 = __importDefault(require("http-proxy"));
const routes = new Map();
const proxy = http_proxy_1.default.createProxyServer({});
// Handle proxy errors
proxy.on('error', (err, req, res) => {
    console.error('[Proxy] Error:', err);
    if (res && 'writeHead' in res) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
    }
});
// Create the HTTP server that intercepts requests
const server = http_1.default.createServer((req, res) => {
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
function addRoute(domain, containerAddr) {
    routes.set(domain, containerAddr);
    console.log(`[Proxy] Added route: ${domain} -> ${containerAddr}`);
}
/**
 * Starts the proxy server.
 * @param port The port to listen on.
 */
function startProxyServer(port) {
    server.listen(port, () => {
        console.log(`[Quay] Starting Reverse Proxy on port ${port}`);
    });
}
