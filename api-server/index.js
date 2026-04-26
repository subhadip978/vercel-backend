const express = require('express');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const z = require('zod');
const { PrismaClient } = require('@prisma/client');

const prismaClient = new PrismaClient();
const app = express();
app.use(express.json());
const PORT = 9000;
const ecsClient = new ECSClient({
	credentials:{
		accesskey:process.env.ACCESSKEY,
		secretkey:process.env.SECRETKEY

	}
})

//  arn:aws:ecs:ap-south-1:123456789012:cluster/my-cluster

const input={
	CLUSTER:process.env.CLUSTER_ARN,
	TASK:process.env.TASK_ARN
}


app.post('/project',async(req,res)=>{
	const schema = z.object({
			name:z.string(),
			gitURL:z.string()
		});

	const safeParseResult = schema.safeParse(req.body);
	if(safeParseResult.error) return res.status(400).json({error:safeParseResult.error});

		const{name,gitURL} = safeParseResult.data;
		const generateSlug = () => Math.random().toString(36).substring(2, 7);
		const project = await prismaClient.project.create({
			data:{
				name, gitURL, subDomain: generateSlug()
			}
		})
		return res.json({status:'success',data:{project}})
})




app.post('/deploy',async(req,res)=>{
	
	const {projectId}=req.body ;
	const project = await prismaClient.project.findUnique({where:{id:projectId}});

	if(!project) return res.status(404).json({error:'project not found'})

			const deployment= await prismaClient.deployment.create({
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
              { name: "PROJECT_NAME", value: project.name },
              { name: "GIT_URL", value: project.gitURL },
              { name: "PROJECT_ID", value: projectId },
              { name: "DEPLOYMENT", value: String(deployment.id) },
            ]
          }
	]
}
})

const response = await ecsClient.send(command)
return res.json({status:'queued',data:{url:`http://${project.subDomain}.localhost.8000`}})

})

app.listen(PORT,()=>{
	console.log(`server is running at http://localhost:${PORT}`)
})