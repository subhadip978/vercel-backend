"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const mime_types_1 = __importDefault(require("mime-types"));
const ioredis_1 = __importDefault(require("ioredis"));
const PROJECT_ID = process.env.PROJECT_ID || '';
// Connect to default Redis instance. You should provide a proper connection string in production.
const publisher = new ioredis_1.default(process.env.REDIS_URL || '');
async function publishLog(logMessage) {
    // Instantly stream logs to Redis Pub/Sub for the frontend WebSocket to pick up
    publisher.publish(`logs:${PROJECT_ID}`, logMessage);
}
const s3Client = new client_s3_1.S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.ACCESSKEY_ID || '',
        secretAccessKey: process.env.SECRET_ACCESSKEY || ''
    }
});
async function init() {
    try {
        console.log('Executing script.ts');
        await publishLog('Build started ............');
        const outdirpath = path_1.default.join(__dirname, 'output');
        const buildProcess = (0, child_process_1.exec)(`cd ${outdirpath} && npm install && npm run build`);
        if (buildProcess.stdout) {
            buildProcess.stdout.on('data', function (data) {
                const strData = data.toString();
                console.log(strData);
                publishLog(strData);
            });
        }
        if (buildProcess.stderr) {
            buildProcess.stderr.on('data', function (data) {
                const strData = data.toString();
                console.error(strData);
                publishLog(`ERROR: ${strData}`);
            });
        }
        buildProcess.on('close', async function (code) {
            console.log(`Build complete with code ${code}..............`);
            await publishLog(`Build completed with code ${code}`);
            if (code !== 0) {
                await publishLog('Build failed. Aborting upload.');
                process.exit(1);
            }
            const distFolderPath = path_1.default.join(__dirname, 'output', 'dist');
            let distFolderContents = [];
            try {
                distFolderContents = fs_1.default.readdirSync(distFolderPath, { recursive: true });
            }
            catch (err) {
                console.error("Failed to read dist directory:", err);
                await publishLog("Failed to read build output directory. Did the build create a 'dist' folder?");
                process.exit(1);
            }
            console.log("After reading content.................: ", distFolderContents);
            publishLog("Uploading build output ................");
            for (const filePath of distFolderContents) {
                const fullFilePath = path_1.default.join(distFolderPath, filePath);
                console.log("filepath: ", fullFilePath);
                if (fs_1.default.lstatSync(fullFilePath).isDirectory())
                    continue;
                console.log(`uploading`, filePath);
                // Standardize file paths for S3 (replace backslashes on windows)
                const s3Key = filePath.replace(/\\/g, '/');
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: process.env.S3_BUCKET || 'vercel-clone',
                    Key: `__outputs/${PROJECT_ID}/${s3Key}`,
                    Body: fs_1.default.createReadStream(fullFilePath),
                    ContentType: mime_types_1.default.lookup(fullFilePath) || 'application/octet-stream'
                });
                await s3Client.send(command);
            }
            console.log("DONE ------");
            await publishLog("Deployment completed --------------");
            // Allow time for final Redis publish before exiting
            setTimeout(() => process.exit(0), 500);
        });
    }
    catch (err) {
        console.error("Init failed:", err);
        process.exit(1);
    }
}
init();
