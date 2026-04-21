const {exec} =require("child_process")
const path=require('path')

const fs=require('fs');
const {Kafka} = require('kafkajs')

const {S3Client, PutObjectCommand}=require('@aws-sk/client-s3')
const mime= require('mime-types')


const kafka = new Kafka({
  clientId: `docker-build-server-${DEPLOYMENT_ID}`,
  brokers: ['your-broker:9092'],
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname,'ca.pem'),'utf-8')],
  },
  sasl: {
    mechanism: 'plain',
    username: 'user',
    password: 'pass',
  },
})


const producer = kafka.producer();


async function publishLog(message) {
  publisher.publish(`logs:${PROJECT_ID}`, message);

  await producer.send({topic:`container-logs`, message:[{key:'log',value:JSON.stringify({PROJECT_ID})}]})
}

const publisher=  new Redis('')
const s3Client= new S3Client({
	region:'ap-south-1',
	credentials:{
		accessKeyId:process.env.ACCESSKEY_ID,
		secretAccessKey:process.env.SECRET_ACCESSKEY

	}
})


const PROJECT_ID =process.env.PROJECT_ID

//============= here we build the code after cloning =======================
async function init(){

		await producer.connect();
	console.log('Executing script.js')
	await publishLog('Build started ............')

	const outdirpath=path.join(__dirname,'output') ;
	//the absolute path of the directort that contain the script.js file taht is home/app/script.js
	//  /home/app/output

	const buildProcess= exec(`cd ${outdirpath}&& npm install && npm run build`)

	buildProcess.stdout.on('data',function(data){
		console.log(data.toString())
		publishLog(data.toString())
	})

	buildProcess.on('close',async function(){
		console.log('Build complete..............');
		await publishLog("Build completed successfully");

		const distFolderPath=path.join(__dirname,'output','dist')
				
		const distFolderContents=fs.readdirSync(distFolderPath, { recursive: true} )
		console.log("After reading content.................: ",distFolderContents)
		publishLog("Uploading build output ................")

		for(const filePath of distFolderContents){
			console.log("filepath: ",filePath);
			if(fs.lstatSync(filePath).isDirectory()) continue ;
			console.log(`uploading`,filePath)

			const command=new PutObjectCommand({
				Bucket:'',
				Key:`___outputs/${PROJECT_ID}/${filePath}`,
				Body:fs.createReadStream(filePath),
				ContentType:mime.lookup(filePath)	

			})
			await s3Client.send(command)
		}
		console.log("DONE ------")
		await publishLog("Deployment completed --------------");
	})



}

init()