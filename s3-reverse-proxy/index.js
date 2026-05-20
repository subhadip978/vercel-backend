const express= require('express');
const app=express();
const PORT =8000 
const httpProxy=require('http-proxy')



const proxy = httpProxy.createProxyServer({});

app.use((req,res)=>{
		const  hostname=req.hostname;
		const subdomain=hostname.split('.')[0] ;
		// a1.localhost:8000 -->a1
		const resolvesTo= `http://vercel-clone.s3.ap-south-1.amazonaws.com/__outputs/${subdomain}`;

		proxy.web(req,res,{target:resolvesTo,changeOrigin:true})
})

proxy.on('proxyReq',(proxyReq, req, res)=>{
	const url=req.url ;
	if(url ==="/"){
		proxyReq.path+='index.html' ;
	}
})

app.listen(PORT,()=>{
	console.log(`reverse proxy is running at http://localhost:${PORT}`)
})


//when request come to reverse proxy ,it will mapped this __outputs/{project_id}
// why use revere proxy ?
// if not use reverse proxy then request hit to node srever and it will do get object to s3 bucket and upload to client which will increase the memory spike , bandwidth 
