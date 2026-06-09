import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import mime from 'mime-types';
import Redis from 'ioredis';

const PROJECT_ID = process.env.PROJECT_ID || '';

// Connect to default Redis instance. You should provide a proper connection string in production.
const publisher = new Redis(process.env.REDIS_URL || '');

async function publishLog(logMessage: string): Promise<void> {
  // Instantly stream logs to Redis Pub/Sub for the frontend WebSocket to pick up
  publisher.publish(`logs:${PROJECT_ID}`, logMessage);
}

const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.ACCESSKEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESSKEY || ''
  }
});

async function init(): Promise<void> {
  try {
    console.log('Executing script.ts');
    await publishLog('Build started ............');

    const outdirpath = path.join(__dirname, 'output');

    const buildProcess = exec(`cd ${outdirpath} && npm install && npm run build`);

    if (buildProcess.stdout) {
      buildProcess.stdout.on('data', function(data: Buffer | string) {
        const strData = data.toString();
        console.log(strData);
        publishLog(strData);
      });
    }

    if (buildProcess.stderr) {
      buildProcess.stderr.on('data', function(data: Buffer | string) {
        const strData = data.toString();
        console.error(strData);
        publishLog(`ERROR: ${strData}`);
      });
    }

    buildProcess.on('close', async function(code: number) {
      console.log(`Build complete with code ${code}..............`);
      await publishLog(`Build completed with code ${code}`);

      if (code !== 0) {
        await publishLog('Build failed. Aborting upload.');
        process.exit(1);
      }

      const distFolderPath = path.join(__dirname, 'output', 'dist');
      
      let distFolderContents: string[] = [];
      try {
        distFolderContents = fs.readdirSync(distFolderPath, { recursive: true }) as string[];
      } catch (err: unknown) {
        console.error("Failed to read dist directory:", err);
        await publishLog("Failed to read build output directory. Did the build create a 'dist' folder?");
        process.exit(1);
      }

      console.log("After reading content.................: ", distFolderContents);
      publishLog("Uploading build output ................");

      for (const filePath of distFolderContents) {
        const fullFilePath = path.join(distFolderPath, filePath);
        console.log("filepath: ", fullFilePath);
        
        if (fs.lstatSync(fullFilePath).isDirectory()) continue;
        console.log(`uploading`, filePath);

        // Standardize file paths for S3 (replace backslashes on windows)
        const s3Key = filePath.replace(/\\/g, '/');

        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET || 'vercel-clone',
          Key: `__outputs/${PROJECT_ID}/${s3Key}`,
          Body: fs.createReadStream(fullFilePath),
          ContentType: mime.lookup(fullFilePath) || 'application/octet-stream'	
        });

        await s3Client.send(command);
      }
      
      console.log("DONE ------");
      await publishLog("Deployment completed --------------");
      
      // Allow time for final Redis publish before exiting
      setTimeout(() => process.exit(0), 500);
    });
  } catch (err: unknown) {
    console.error("Init failed:", err);
    process.exit(1);
  }
}

init();