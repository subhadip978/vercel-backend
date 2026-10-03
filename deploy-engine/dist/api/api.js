"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupApiRoutes = setupApiRoutes;
exports.startApiServer = startApiServer;
const express_1 = __importDefault(require("express"));
const docker_1 = require("../docker/docker");
const proxy_1 = require("../proxy/proxy");
const app = (0, express_1.default)();
app.use(express_1.default.json());
function setupApiRoutes(network, baseProxyDomain) {
    app.post('/deploy', async (req, res) => {
        const { image, container_name, port } = req.body;
        if (!image || !container_name || !port) {
            return res.status(400).json({ error: 'image, container_name, and port are required' });
        }
        try {
            // 1. Run the container
            await (0, docker_1.runContainer)(image, container_name, network);
            // 2. Generate the domain and internal address
            const domain = `${container_name}.${baseProxyDomain}`;
            const internalAddr = `http://${container_name}:${port}`;
            // 3. Add to routing table
            (0, proxy_1.addRoute)(domain, internalAddr);
            // 4. Return success
            return res.status(200).json({
                message: 'Deployed successfully',
                url: `http://${domain}`
            });
        }
        catch (error) {
            console.error('Failed to run container:', error);
            return res.status(500).json({ error: `Failed to run container: ${error.message}` });
        }
    });
}
/**
 * Starts the API server.
 * @param port The port to listen on.
 */
function startApiServer(port) {
    app.listen(port, () => {
        console.log(`[Quay] Starting Management API on port ${port}`);
    });
}
