const express= require('express');
const app=express();
const PORT =9000 


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
})

app.post('/deploy',async(req,res)=>{
	
	const {projectName, gitURL}=req.body ;
	const projectSlug=generateSlug();

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
              { name: "PROJECT_SLUG", value: projectSlug }
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