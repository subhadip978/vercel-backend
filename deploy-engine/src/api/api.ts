import express, { Request, Response } from 'express';
import { runContainer } from '../docker/docker';
import { addRoute } from '../proxy/proxy';

const app = express();
app.use(express.json());

export function setupApiRoutes(network: string, baseProxyDomain: string): void {
  app.post('/deploy', async (req: Request, res: Response) => {
    const { image, container_name, port } = req.body;

    if (!image || !container_name || !port) {
      return res.status(400).json({ error: 'image, container_name, and port are required' });
    }

    try {
      // 1. Run the container
      await runContainer(image, container_name, network);

      // 2. Generate the domain and internal address
      const domain = `${container_name}.${baseProxyDomain}`;
      const internalAddr = `http://${container_name}:${port}`;

      // 3. Add to routing table
      addRoute(domain, internalAddr);

      // 4. Return success
      return res.status(200).json({
        message: 'Deployed successfully',
        url: `http://${domain}`
      });
    } catch (error) {
      console.error('Failed to run container:', error);
      return res.status(500).json({ error: `Failed to run container: ${(error as Error).message}` });
    }
  });
}

/**
 * Starts the API server.
 * @param port The port to listen on.
 */
export function startApiServer(port: number): void {
  app.listen(port, () => {
    console.log(`[Quay] Starting Management API on port ${port}`);
  });
}
