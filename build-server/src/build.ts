import { exec } from 'child_process';
import http from 'http';

export async function buildDockerImage(
  outdir: string, 
  imageName: string, 
  publishLog: (msg: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    publishLog(`Starting Docker build for image: ${imageName}...`);
    
    const buildProcess = exec(`cd ${outdir} && docker build -t ${imageName} .`);

    buildProcess.stdout?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) publishLog(`[Docker Build] ${msg}`);
    });

    buildProcess.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) publishLog(`[Docker Err] ${msg}`);
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        publishLog(`Docker build completed successfully!`);
        resolve();
      } else {
        publishLog(`Docker build failed with code ${code}`);
        reject(new Error(`Docker build failed`));
      }
    });
  });
}

export async function notifyDeployEngine(
  imageName: string, 
  containerName: string, 
  port: number,
  publishLog: (msg: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    publishLog(`Notifying Deploy Engine to launch ${containerName} on port ${port}...`);

    const postData = JSON.stringify({
      image: imageName,
      container_name: containerName,
      port: port
    });

    const options = {
      hostname: 'ingress-api',
      port: 8080,
      path: '/deploy',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          publishLog(`Successfully deployed! Engine responded: ${data}`);
          resolve();
        } else {
          publishLog(`Deploy engine failed with code ${res.statusCode}: ${data}`);
          reject(new Error(`Deploy engine returned ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      publishLog(`Failed to contact deploy engine: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}
