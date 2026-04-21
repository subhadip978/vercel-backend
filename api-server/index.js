const express= require('express');
const app=express();
const PORT =9000 

const {prismaCleint }=require('@prisma/client	')

const config ={
	task:"hhj",
	cluster:"ttyy"
}
const ecsClient = new ECSClient({
	credentials:{
		accesskey:process.env.ACCESSKEY,
		secretkey:process.env.SECRETKEY

	}
})

//  arn:aws:ecs:ap-south-1:123456789012:cluster/my-cluster
// This is the ARN of your task definition
const input={
	CLUSTER:process.env.CLUSTER_ARN,
	TASK:process.env.TASK_ARN
}


app.post('/project',(req,res)=>{
const schema = z.object({
		name:z.string(),
		gitUrl:z.string()
	});

	const safeParseResult = schema.safeParse(req.body);
	if(safeParseResult.error) return res.status(400),json({error:error})

		const{name,gitURL} = safeParseResult.data;
		const project =await prismaCleint.project.create({
			data:{
				name,gitURL,subDomain:generateSlug()
			}
		})

		return res.json({status:'success',data:{project}})
})




app.post('/deploy',async(req,res)=>{
	
	const {projectId}=req.body ;
	const project = await prismaCleint.project.findUnique({where:{id:projectId}});

	if(!project) return res.status(404).json({error:'project not found'})

			const deployment= await prismaCleint.deployment.create({
				data:{
					project:{connect:{id:projectId}}
				}
			})
	//spin the container on ECS
	const command= new RunTaskCommand({
		cluster:input.CLUSTER,
		taskDefinition:input.TASK,
		launchType:'FARGATE',
		count:1,
		networkConfiguration:{
			subnets:['subnet'],
			securityGroups:['sg']
		},

overrides:{
	containerOverrides:[
		{
            name: "builder-container",
            environment: [
              { name: "PROJECT_NAME", value: projectName },
              { name: "GIT_URL", value: gitURL },
              { name: "PROJECT_ID", value: projectId },
              { name: "DEPLOYMENT", value: deployment.id },
            ]
          }
	]
}
})

const response = await ecsClient.send(command)
return res.json({status:queued,data:{url:`http://${projectSlug}.localhost.8000`}})

})

app.listen(PORT,()=>{
	console.log(`server is running at http://localhost:${port}`)
})