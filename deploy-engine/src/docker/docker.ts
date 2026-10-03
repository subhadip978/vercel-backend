import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Pulls an image, creates, and starts a container.
 * @param imageName - The name of the image to pull and run.
 * @param containerName - The name to assign to the container.
 * @param networkName - The network to attach the container to.
 * @returns The ID of the started container.
 */
export async function runContainer(imageName: string, containerName: string, networkName: string): Promise<string> {
  try {
    console.log(`[Docker] Pulling image ${imageName}...`);
    
    await new Promise<void>((resolve, reject) => {
      docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(
          stream,
          (err: Error | null, result: any[]) => {
            if (err) return reject(err);
            resolve();
          },
          (event) => {
            // Optional: log pull progress here
          }
        );
      });
    });

    console.log(`[Docker] Creating container ${containerName}...`);
    const container = await docker.createContainer({
      Image: imageName,
      name: containerName,
      HostConfig: {
        NetworkMode: networkName,
      },
    });

    console.log(`[Docker] Starting container ${containerName} (ID: ${container.id.substring(0, 10)})...`);
    await container.start();

    return container.id;
  } catch (error) {
    throw new Error(`Failed to run container: ${(error as Error).message}`);
  }
}
