import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import mime from 'mime-types';
import Redis from 'ioredis';
import { detectFramework } from './src/detect';
import { generateDockerfile } from './src/generate';
import { buildDockerImage, notifyDeployEngine } from './src/build';

const PROJECT_ID = process.env.PROJECT_ID || '';
const SUBDOMAIN = process.env.SUBDOMAIN || '';

const publisher = new Redis(process.env.REDIS_URL || '');

async function publishLog(logMessage: string): Promise<void> {
  publisher.publish(`logs:${PROJECT_ID}`, logMessage);
}

const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.ACCESSKEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESSKEY || ''
  }
});

async function runStaticReactBuild(outdirpath: string) {
  return new Promise<void>((resolve, reject) => {
    const buildProcess = exec(`cd ${outdirpath} && npm install && npm run build`);

    buildProcess.stdout?.on('data', (data) => {
      const msg = data.toString();
      console.log(msg);
      publishLog(msg);
    });

    buildProcess.stderr?.on('data', (data) => {
      const msg = data.toString();
      console.error(msg);
      publishLog(`ERROR: ${msg}`);
    });

    buildProcess.on('close', async (code) => {
      console.log(`Build complete with code ${code}..............`);
      await publishLog(`Build completed with code ${code}`);

      if (code !== 0) {
        await publishLog('Build failed. Aborting upload.');
        return reject(new Error('Build failed'));
      }

      const distFolderPath = path.join(outdirpath, 'dist');
      let distFolderContents: string[] = [];
      try {
        distFolderContents = fs.readdirSync(distFolderPath, { recursive: true }) as string[];
      } catch (err: unknown) {
        await publishLog("Failed to read build output directory. Did the build create a 'dist' folder?");
        return reject(err);
      }

      publishLog("Uploading build output to S3 ................");

      for (const filePath of distFolderContents) {
        const fullFilePath = path.join(distFolderPath, filePath);
        if (fs.lstatSync(fullFilePath).isDirectory()) continue;

        const s3Key = filePath.replace(/\\/g, '/');
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET || 'vercel-clone',
          Key: `__outputs/${SUBDOMAIN}/${s3Key}`,
          Body: fs.createReadStream(fullFilePath),
          ContentType: mime.lookup(fullFilePath) || 'application/octet-stream'	
        });

        await s3Client.send(command);
      }
      
      resolve();
    });
  });
}

async function init(): Promise<void> {
  try {
    console.log('Executing script.ts');
    await publishLog('Build started ............');

    const outdirpath = path.join(__dirname, '../output');
    
    // 1. Detect Framework
    const framework = detectFramework(outdirpath);
    await publishLog(`Detected Framework: ${framework}`);

    if (framework === 'REACT_STATIC') {
      // ➔ STATIC S3 PIPELINE
      await publishLog('Routing to S3 Static Pipeline...');
      await runStaticReactBuild(outdirpath);
    } else {
      // ➔ DYNAMIC DOCKER PIPELINE
      await publishLog('Routing to Dynamic Docker Pipeline...');
      
      // Generate Dockerfile
      const exposedPort = generateDockerfile(framework, outdirpath);
      await publishLog(`Generated Dockerfile for ${framework} on port ${exposedPort}`);
      
      // Build Image
      const imageName = `vercel-clone-project-${SUBDOMAIN}`;
      await buildDockerImage(outdirpath, imageName, publishLog);

      // Notify Engine
      await notifyDeployEngine(imageName, SUBDOMAIN, exposedPort, publishLog);
    }

    await publishLog("Deployment completed --------------");
    setTimeout(() => process.exit(0), 500);

  } catch (err: unknown) {
    console.error("Init failed:", err);
    await publishLog(`Deployment failed: ${(err as Error).message}`);
    setTimeout(() => process.exit(1), 500);
  }
}

init();