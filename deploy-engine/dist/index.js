"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxy_1 = require("./proxy/proxy");
const api_1 = require("./api/api");
async function main() {
    try {
        // Configuration
        const proxyPort = parseInt(process.env.PROXY_PORT || '80', 10);
        const apiPort = parseInt(process.env.API_PORT || '8080', 10);
        const networkName = process.env.QUAY_NETWORK || 'bridge';
        const baseDomain = process.env.QUAY_DOMAIN || 'localhost';
        // Start Proxy Server
        (0, proxy_1.startProxyServer)(proxyPort);
        // Setup and Start API Server
        (0, api_1.setupApiRoutes)(networkName, baseDomain);
        (0, api_1.startApiServer)(apiPort);
    }
    catch (error) {
        console.error('Startup failed:', error);
        process.exit(1);
    }
}
main();
