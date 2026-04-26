# Vercel Clone Backend Architecture

Welcome to the backend component of the **Vercel Clone Project**. This repository contains the essential microservices required to handle project creation, continuous integration (building from Git repositories), and serving deployed static sites via a scalable reverse proxy.

## Project Overview

This backend architecture faithfully replicates the core deployment workflow of managed static web hosting platforms. When a user submits a GitHub repository, the system spins up a dedicated, isolated build container on AWS ECS Fargate. This container clones the repository, installs dependencies, builds the project, and pushes the production assets to an AWS S3 bucket. Additionally, it features a reverse proxy that maps wildcard subdomains directly to their respective directories in S3, allowing users to visit their live projects immediately.

### System Architecture

```mermaid
flowchart TD
    User([Developer / End User])
    GitHub[(GitHub Repository)]
    
    subgraph Control_Plane ["Control Plane"]
        direction TB
        API[API Server (Express)]
        DB[(PostgreSQL)]
    end
    
    subgraph Build_Plane ["Build Engine (AWS ECS)"]
        direction TB
        Builder[Build Container]
        Kafka[Kafka / Redis Logs]
    end
    
    subgraph Hosting_Proxy ["Data & Edge Plane"]
        direction TB
        Proxy[S3 Reverse Proxy (Express)]
        S3[(AWS S3 Bucket)]
    end
    
    %% Deployment flow
    User -- "1. POST /project (Provide Git URL)" --> API
    API -- "2. Stores Metadata" --> DB
    API -- "3. Provisions Task" --> Builder
    
    %% Build flow
    Builder -- "4. Clones source code" --> GitHub
    Builder -- "5. Streams Live Logs" --> Kafka
    Builder -- "6. Uploads static output" --> S3
    
    %% Access flow
    User -- "7. Visits subDomain.localhost:8000" --> Proxy
    Proxy -- "8. Proxies requested path to S3" --> S3
```

## Features

- **Automated Containerized Builds**: Dynamically launches AWS ECS tasks (Docker containers) to build user repositories on demand.
- **Microservices Architecture**: Segregates responsibilities into API, Builder, and Proxy servers.
- **Real-time Logging**: Streams live build logs from the build container using Kafka and Redis.
- **S3 Asset Hosting**: Pushes static site build outputs to AWS S3, guaranteeing high availability.
- **Dynamic Reverse Proxy**: Resolves wildcard subdomains locally (e.g., `http://my-project.localhost:8000`) dynamically to S3 objects without performance bottlenecks.

## Tech Stack

- **Frameworks & Languages**: Node.js, Express.js.
- **Database / ORM**: PostgreSQL, Prisma.
- **Cloud Infrastructure**: AWS S3, AWS ECS (Fargate).
- **Message Broker & Pub/Sub**: Apache Kafka, Redis.
- **Validation**: Zod.
- **Containerization**: Docker.

## Folder Structure

The project is structured into three main discrete nodes:

```text
vercelserver/
├── api-server/         # Main orchestration server. Exposes the endpoints to receive project details, saves to DB via Prisma, and triggers AWS ECS Fargate tasks to build projects.
├── build-server/       # The actual Dockerized build environment. Clones code, runs npm install & build, and uploads logs dynamically alongside the final assets to AWS S3.
├── s3-reverse-proxy/   # An HTTP reverse proxy. Proxies wildcard subdomains (your-slug.localhost:8000) directly to the AWS S3 URL bucket representing the static assets.
├── Dockerfile          # Used specifically for the build-server environment
└── main.sh             # Entrypoint script for the Docker build container
```

## Setup & Installation

Ensure you have Node.js (v18+) and Docker installed on your machine.
Clone the repository, and inside `vercelserver`, install dependencies for each service:

```bash
# In the api-server directory
cd api-server
npm install

# In the build-server directory
cd ../build-server
npm install

# In the reverse proxy directory
cd ../s3-reverse-proxy
npm install
```

## Running Locally

To run the full stack locally, you need to spin up the three distinct servers in separate terminal instances or via a task manager (like `pm2` or `concurrently`).

1. **Start the API Server**:
   ```bash
   cd api-server
   npm run start # or node index.js
   ```

2. **Start the Reverse Proxy**:
   ```bash
   cd s3-reverse-proxy
   npm run start # or node index.js
   ```

3. _Note: The `build-server` is not meant to be run directly on the host machine. It is designed to be executed via Docker and orchestrated tightly via ECS._

## Docker Setup

The `build-server` must be built into a Docker image and pushed to AWS ECR (Elastic Container Registry), as the API server will direct AWS ECS Fargate tasks to pull and run this specific snapshot image.

```bash
# In the root repository
docker build -t vercel-clone-builder:latest .

# Tag & push it to your AWS ECR Registry
docker tag vercel-clone-builder:latest <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/vercel-clone-builder
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/vercel-clone-builder
```

## PostgreSQL Setup

The project uses Prisma as its ORM over a PostgreSQL database. Ensure your PostgreSQL server is active.

1. Adjust the `DATABASE_URL` in `api-server/.env` based on your Postgres configuration.
2. Push the Prisma schema to the database:
   ```bash
   cd api-server
   npx prisma db push
   ```

## Environment Variables

An example `.env` file reflecting what needs to be set in your `api-server` directory.

```dotenv
# api-server/.env

# Prisma Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/vercel_clone?schema=public"

# AWS Client Configuration
ACCESSKEY="your-aws-access-key"
SECRETKEY="your-aws-secret-key"

# AWS ECS Task Configuration
CLUSTER_ARN="arn:aws:ecs:region:account:cluster/your-cluster"
TASK_ARN="arn:aws:ecs:region:account:task-definition/your-task-definition:version"
```

In your `build-server` container environment:
```dotenv
PROJECT_ID="provided-by-api-server"
DEPLOYMENT="provided-by-api-server"
ACCESSKEY_ID="your-aws-access-key"
SECRET_ACCESSKEY="your-aws-secret-key"
```

## API Endpoints Documentation

### **1. Create Project**
Registers a new project on the platform and prepares it for deployment.
- **URL**: `/project`
- **Method**: `POST`
- **Body**:
  ```json
  {
      "name": "My Portfolio",
      "gitURL": "https://github.com/my-username/my-portfolio"
  }
  ```
- **Response**:
  ```json
  {
      "status": "success",
      "data": {
          "project": {
              "id": "uuid-here",
              "name": "My Portfolio",
              "gitURL": "...",
              "subDomain": "x9a2k"
          }
      }
  }
  ```

### **2. Deploy Project**
Triggers a fresh AWS ECS Fargate build container pipeline.
- **URL**: `/deploy`
- **Method**: `POST`
- **Body**:
  ```json
  {
      "projectId": "uuid-from-project-creation"
  }
  ```
- **Response**:
  ```json
  {
      "status": "queued",
      "data": {
          "url": "http://x9a2k.localhost.8000"
      }
  }
  ```
