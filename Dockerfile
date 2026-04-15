# 1️⃣ Base image (Ubuntu 20.04)
FROM ubuntu:focal

# install system dependency
RUN apt-get update
RUN apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - 
RUN apt-get install -y nodejs
RUN apt-get  install -y git 

WORKDIR /home/app

COPY main.sh main.sh
COPY script.js script.js
COPY package*.json .

RUN npm install

# Make shell script executable
RUN chmod +x main.sh
RUN chmod +x script.js

# Run the script main.sh logic  
ENTRYPOINT ["/home/app/main.sh"]
# So when ECS or Docker runs this image, it executes: /home/app/main.sh
