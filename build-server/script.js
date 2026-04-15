const {exec} =require("child_process")
const path=require('path')

const fs=require('fs');
const Redis= require('ioredis')

const {S3Client, PutObjectCommand}=require('@aws-sk/client-s3')
const mime= require('mime-types')



function publishLog(message) {
  publisher.publish(`logs:${PROJECT_ID}`, message)
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

	console.log('Executing script.js')
	publishLog('Build started ............')

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
		publishLog("Build completed successfully");

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
		publishLog("Deployment completed --------------");
	})



}

init()