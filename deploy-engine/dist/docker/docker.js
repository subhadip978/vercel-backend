"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runContainer = runContainer;
const dockerode_1 = __importDefault(require("dockerode"));
const docker = new dockerode_1.default({ socketPath: '/var/run/docker.sock' });
/**
 * Pulls an image, creates, and starts a container.
 * @param imageName - The name of the image to pull and run.
 * @param containerName - The name to assign to the container.
 * @param networkName - The network to attach the container to.
 * @returns The ID of the started container.
 */
async function runContainer(imageName, containerName, networkName) {
    try {
        console.log(`[Docker] Pulling image ${imageName}...`);
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err, stream) => {
                if (err)
                    return reject(err);
                docker.modem.followProgress(stream, (err, result) => {
                    if (err)
                        return reject(err);
                    resolve();
                }, (event) => {
                    // Optional: log pull progress here
                });
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
    }
    catch (error) {
        throw new Error(`Failed to run container: ${error.message}`);
    }
}
