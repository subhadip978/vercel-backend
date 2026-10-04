import { startProxyServer } from './proxy/proxy';
import { setupApiRoutes, startApiServer } from './api/api';

async function main() {
  try {
    // Configuration
    const proxyPort = parseInt(process.env.PROXY_PORT || '80', 10);
    const apiPort = parseInt(process.env.API_PORT || '9080', 10);
    
    const networkName = process.env.INGRESS_NETWORK || process.env.QUAY_NETWORK || 'bridge';
    const baseDomain = process.env.INGRESS_DOMAIN || process.env.QUAY_DOMAIN || 'localhost';

    // Start Proxy Server
    startProxyServer(proxyPort);

    // Setup and Start API Server
    setupApiRoutes(networkName, baseDomain);
    startApiServer(apiPort);

  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

main();
