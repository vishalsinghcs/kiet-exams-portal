# 🚀 KIET Exams Portal — AWS Deployment Guide

This guide deploys your app to the **exact architecture** described in `master_implementation_plan.md`.

## Final Architecture

```
Students (Browser)
      │
      ▼
CloudFront CDN ──► S3 (React Frontend)
      │
      ▼
Application Load Balancer
      │
      ▼
ECS Fargate (FastAPI backend × 2 tasks)
      │         │              │
      ▼         ▼              ▼
  AWS RDS   ElastiCache    S3 Bucket
(PostgreSQL)  (Redis)    (File Uploads)
```

> [!IMPORTANT]
> **Database Strategy:** Your current Supabase free tier cannot handle 1000+ concurrent users. This guide migrates you to **AWS RDS PostgreSQL** (Multi-AZ, auto-scaling) and adds **AWS ElastiCache Redis** for single-device session enforcement, exactly as specified in the plan.

---

## 📋 PHASE 0 — Prerequisites

### Step 1: Create an AWS Account

1. Go to [https://aws.amazon.com](https://aws.amazon.com) → **Create an AWS Account**
2. Enter email, password, billing info (credit card required)
3. Choose **Basic (Free)** support plan
4. Select region: **Asia Pacific (Mumbai) — `ap-south-1`** throughout this guide

### Step 2: Install Required Tools (PowerShell as Administrator)

```powershell
# Install AWS CLI
winget install Amazon.AWSCLI

# Install Docker Desktop — download from https://www.docker.com/products/docker-desktop/
# After install, open Docker Desktop and make sure it shows "Engine running"

# Verify
aws --version
docker --version
```

### Step 3: Create an IAM User (Never use root account!)

1. AWS Console → **IAM** → **Users** → **Create user**
2. Username: `kiet-deploy-user`
3. Click **Next** → **Attach policies directly**, attach:
   - `AmazonECS_FullAccess`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `SecretsManagerReadWrite`
   - `AmazonRDSFullAccess`
   - `AmazonElastiCacheFullAccess`
   - `AmazonVPCFullAccess`
   - `IAMFullAccess`
4. **Create user** → click the user → **Security credentials** tab → **Create access key** → Choose **CLI**
5. Save your **Access Key ID** and **Secret Access Key** somewhere safe!

### Step 4: Configure AWS CLI

```powershell
aws configure
# AWS Access Key ID:     [paste your key]
# AWS Secret Access Key: [paste your secret]
# Default region name:   ap-south-1
# Default output format: json
```

---

## 🗄️ PHASE 1 — Set Up AWS RDS (PostgreSQL)

This replaces your Supabase free tier with a production-grade managed PostgreSQL instance.

### Step 5: Create a VPC Security Group for the Database

```powershell
# Get your default VPC ID
aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text
# Save this output — e.g. vpc-0abc1234

# Create a security group for RDS
aws ec2 create-security-group `
  --group-name kiet-rds-sg `
  --description "Security group for KIET RDS PostgreSQL" `
  --vpc-id vpc-0abc1234
# Save the GroupId output — e.g. sg-0rds1234
```

### Step 6: Create the RDS PostgreSQL Instance

```powershell
aws rds create-db-instance `
  --db-instance-identifier kiet-exams-db `
  --db-instance-class db.t3.medium `
  --engine postgres `
  --engine-version 16.3 `
  --master-username kiet_admin `
  --master-user-password "KietExams@2024Secure!" `
  --db-name kiet_exams `
  --allocated-storage 20 `
  --storage-type gp3 `
  --vpc-security-group-ids sg-0rds1234 `
  --backup-retention-period 7 `
  --no-publicly-accessible `
  --region ap-south-1
```

> [!IMPORTANT]
> `--no-publicly-accessible` keeps your database inside the VPC (private network) — only your ECS containers can reach it. This is critical for security.

This takes **~10 minutes** to provision. Check status:

```powershell
aws rds describe-db-instances --db-instance-identifier kiet-exams-db --query "DBInstances[0].DBInstanceStatus" --output text
# Wait until it says "available"
```

Once available, get the **endpoint hostname**:

```powershell
aws rds describe-db-instances --db-instance-identifier kiet-exams-db --query "DBInstances[0].Endpoint.Address" --output text
# Output looks like: kiet-exams-db.xyz123.ap-south-1.rds.amazonaws.com
```

Your new `DATABASE_URL` will be:

```
postgresql://kiet_admin:KietExams@2024Secure!@kiet-exams-db.xyz123.ap-south-1.rds.amazonaws.com:5432/kiet_exams
```

### Step 7: Migrate Your Data from Supabase to RDS

You need to export all existing data from Supabase and import it into RDS. Run this on your local machine:

```powershell
# Step A: Export from Supabase (using your current DATABASE_URL from .env)
# Install pg_dump if you don't have it — download PostgreSQL tools from https://www.postgresql.org/download/windows/
pg_dump "postgresql://postgres.rfqxwegcxmwulxifyzcx:0MvRzTsIJLN36ZFK@aws-1-ap-south-1.pooler.supabase.com:6543/postgres" `
  --no-owner --no-acl `
  -f supabase_backup.sql

# Step B: Temporarily allow public access to RDS for the migration
# (Go to AWS Console → RDS → your DB → Modify → Enable "Publicly accessible" → Apply immediately)
# Also add an inbound rule to the RDS security group: allow port 5432 from your IP

# Step C: Import into RDS
psql "postgresql://kiet_admin:KietExams@2024Secure!@kiet-exams-db.xyz123.ap-south-1.rds.amazonaws.com:5432/kiet_exams" `
  -f supabase_backup.sql

# Step D: After migration, disable public access again on RDS (important!)
```

> [!TIP]
> If Supabase data is minimal (early stage), you can skip the migration and let SQLAlchemy auto-create the tables fresh on first startup. The admin account will need to be re-seeded using your `seed_admin.py` script.

---

## 🔴 PHASE 2 — Set Up ElastiCache Redis

Redis handles single-device session enforcement — the core security feature of this portal.

### Step 8: Create a Security Group for Redis

```powershell
aws ec2 create-security-group `
  --group-name kiet-redis-sg `
  --description "Security group for KIET ElastiCache Redis" `
  --vpc-id vpc-0abc1234
# Save the GroupId — e.g. sg-0redis1234
```

### Step 9: Create the ElastiCache Redis Cluster

```powershell
aws elasticache create-cache-cluster `
  --cache-cluster-id kiet-exams-redis `
  --cache-node-type cache.t3.micro `
  --engine redis `
  --engine-version 7.0 `
  --num-cache-nodes 1 `
  --security-group-ids sg-0redis1234 `
  --region ap-south-1
```

This takes **~5 minutes**. Check status:

```powershell
aws elasticache describe-cache-clusters --cache-cluster-id kiet-exams-redis --show-cache-node-info --query "CacheClusters[0].CacheClusterStatus" --output text
# Wait until: "available"
```

Get the Redis endpoint:

```powershell
aws elasticache describe-cache-clusters --cache-cluster-id kiet-exams-redis --show-cache-node-info --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" --output text
# Output: kiet-exams-redis.xyz123.0001.apse1.cache.amazonaws.com
```

---

## 💻 PHASE 3 — Update Backend Code for Production

You need to make **two code changes** before building the Docker image.

### Step 10: Update `database.py` — Switch from NullPool to Connection Pooling

The current [database.py](file:///c:/Users/Techn/Downloads/ML%20Exam%20Site/backend/database.py) uses `NullPool` which was **required for Supabase's PgBouncer**. AWS RDS does not use PgBouncer, so we switch to SQLAlchemy's built-in efficient connection pool:

**Replace the entire content of `backend/database.py` with:**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# AWS RDS supports proper connection pooling (unlike Supabase's PgBouncer).
# pool_size=10: Keep 10 persistent connections ready (handles concurrent requests)
# max_overflow=20: Allow up to 20 extra connections during traffic spikes
# pool_pre_ping=True: Test connection health before using it (auto-reconnects if RDS restarts)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300,  # Recycle connections every 5 minutes to avoid stale connections
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Step 11: Update `storage.py` — Implement Real S3 Upload

Add `boto3` to `requirements.txt` (add this line):

```
boto3==1.34.0
```

**Replace the S3 section in [storage.py](file:///c:/Users/Techn/Downloads/ML%20Exam%20Site/backend/storage.py):**

```python
import os
import shutil
import uuid
from fastapi import UploadFile
from typing import Optional

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
UPLOAD_DIR = "uploads"

if STORAGE_BACKEND == "local":
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

async def upload_file(file: UploadFile, subfolder: str) -> str:
    if not file:
        return None

    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    if STORAGE_BACKEND == "local":
        target_dir = os.path.join(UPLOAD_DIR, subfolder)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
        file_path = os.path.join(target_dir, unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path

    elif STORAGE_BACKEND == "s3":
        import boto3
        bucket_name = os.getenv("AWS_S3_BUCKET_NAME")
        s3_key = f"{subfolder}/{unique_filename}"
        s3_client = boto3.client("s3", region_name="ap-south-1")
        s3_client.upload_fileobj(
            file.file,
            bucket_name,
            s3_key,
            ExtraArgs={"ContentType": file.content_type or "application/octet-stream"}
        )
        return f"s3://{bucket_name}/{s3_key}"

    return None
```

### Step 12: Fix CORS for Production in `main.py`

Replace the hardcoded `allow_origins=["*"]` in [main.py](file:///c:/Users/Techn/Downloads/ML%20Exam%20Site/backend/main.py#L21-L27):

```python
# Replace this block:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your frontend URL
    ...
)

# With this:
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🐳 PHASE 4 — Dockerize the Backend

### Step 13: Create `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Step 14: Create `backend/.dockerignore`

```
venv/
__pycache__/
*.pyc
.env
uploads/
*.log
*.sql
```

> [!CAUTION]
> `.env` MUST be in `.dockerignore`. Secrets go into AWS Secrets Manager only — never baked into the Docker image.

### Step 15: Build and Test Locally

```powershell
cd "c:\Users\Techn\Downloads\ML Exam Site\backend"
docker build -t kiet-backend .

# Quick test (using your OLD Supabase .env for now — just to verify the image builds)
docker run --env-file .env -p 8001:8000 kiet-backend
# Visit http://localhost:8001/docs — if you see the Swagger UI, the image is correct
# Press Ctrl+C to stop
```

---

## 📦 PHASE 5 — Push to AWS ECR

### Step 16: Create ECR Repository and Push

```powershell
# Create the repository
aws ecr create-repository --repository-name kiet-exams-backend --region ap-south-1
# Note the repositoryUri from the output

# Get your account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
Write-Host "Account ID: $ACCOUNT_ID"

# Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com"

# Tag and push
docker tag kiet-backend:latest "$ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/kiet-exams-backend:latest"
docker push "$ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/kiet-exams-backend:latest"
```

---

## 🔐 PHASE 6 — Store All Secrets in AWS Secrets Manager

### Step 17: Create the Production Secret

1. AWS Console → **Secrets Manager** → **Store a new secret**
2. Choose **"Other type of secret"** → **Key/value pairs**
3. Add all these values:

| Key                           | Value                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                | `postgresql://kiet_admin:KietExams@2024Secure!@kiet-exams-db.xyz123.ap-south-1.rds.amazonaws.com:5432/kiet_exams` |
| `REDIS_URL`                   | `redis://kiet-exams-redis.xyz123.0001.apse1.cache.amazonaws.com:6379`                                             |
| `SECRET_KEY`                  | _(generate: `python -c "import secrets; print(secrets.token_hex(32))"`)_                                          |
| `ALGORITHM`                   | `HS256`                                                                                                           |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `210`                                                                                                             |
| `BREVO_API_KEY`               | _(your Brevo API key)_                                                                                            |
| `AWS_S3_BUCKET_NAME`          | `kiet-exams-uploads`                                                                                              |
| `STORAGE_BACKEND`             | `s3`                                                                                                              |
| `ALLOWED_ORIGINS`             | `https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net` _(update after Phase 8)_                                          |

4. Click **Next** → Name: `kiet-exams/production` → **Store**

> [!IMPORTANT]
> Generate a new strong `SECRET_KEY` — the old one (`my_super_secret_key`) is not safe for production. Run `python -c "import secrets; print(secrets.token_hex(32))"` in your terminal.

---

## ⚙️ PHASE 7 — Deploy Backend on ECS Fargate

### Step 18: Create IAM Roles for ECS

**Execution Role** (ECS uses this to pull images and read secrets):

1. IAM → **Roles** → **Create role** → AWS service → **Elastic Container Service Task**
2. Attach: `AmazonECSTaskExecutionRolePolicy` + `SecretsManagerReadWrite`
3. Name: `kiet-ecs-execution-role`

**Task Role** (your app code uses this at runtime):

1. IAM → **Roles** → **Create role** → AWS service → **Elastic Container Service Task**
2. Attach: `AmazonS3FullAccess` + `SecretsManagerReadWrite`
3. Name: `kiet-ecs-task-role`

### Step 19: Allow ECS to Reach RDS and Redis

```powershell
# Get the ECS containers' security group ID (you'll create one during service setup)
# For now, add a rule to RDS security group to allow PostgreSQL from within the VPC:
aws ec2 authorize-security-group-ingress `
  --group-id sg-0rds1234 `
  --protocol tcp --port 5432 `
  --cidr 172.31.0.0/16   # This is the default VPC CIDR — adjust if different

# Allow Redis access from within VPC:
aws ec2 authorize-security-group-ingress `
  --group-id sg-0redis1234 `
  --protocol tcp --port 6379 `
  --cidr 172.31.0.0/16
```

### Step 20: Create ECS Cluster

```powershell
aws ecs create-cluster --cluster-name kiet-exams-cluster --region ap-south-1
```

### Step 21: Create Task Definition

1. ECS Console → **Task Definitions** → **Create new task definition**
2. Family name: `kiet-backend-task`
3. Launch type: **AWS Fargate**
4. CPU: **1 vCPU**, Memory: **2 GB** _(increased for RDS connection pool)_
5. Task role: `kiet-ecs-task-role`
6. Task execution role: `kiet-ecs-execution-role`
7. **Add container:**
   - Name: `kiet-backend`
   - Image: `ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/kiet-exams-backend:latest`
   - Port: `8000`
8. **Environment variables** section → for each env var, click **"Add from Secrets Manager"**:
   - Variable name: `DATABASE_URL` → Secret: `kiet-exams/production` → Key: `DATABASE_URL`
   - Variable name: `REDIS_URL` → Secret: `kiet-exams/production` → Key: `REDIS_URL`
   - _(repeat for all keys)_
9. **Log configuration:** Enable **CloudWatch Logs** → Log group: `/ecs/kiet-backend`
10. Click **Create**

### Step 22: Create Application Load Balancer

1. EC2 Console → **Load Balancers** → **Create** → **Application Load Balancer**
2. Name: `kiet-backend-alb`, Scheme: **Internet-facing**
3. VPC: default, select **all available subnets**
4. Security group: create `kiet-alb-sg` → inbound: HTTP(80) + HTTPS(443) from `0.0.0.0/0`
5. Listener: HTTP:80
6. Target group: create `kiet-backend-tg` → IP addresses, port `8000`, health check path `/docs`
7. **Create load balancer** — note the **DNS name** (e.g., `kiet-backend-alb-1234.ap-south-1.elb.amazonaws.com`)

### Step 23: Create ECS Service

1. ECS → `kiet-exams-cluster` → **Services** → **Create**
2. Launch type: **Fargate**, Task definition: `kiet-backend-task`
3. Service name: `kiet-backend-service`, Number of tasks: `2`
4. Networking: default VPC, all subnets, new security group `kiet-ecs-sg` (inbound: port 8000 from `kiet-alb-sg` only)
5. Load balancer: select `kiet-backend-alb` → container `kiet-backend:8000` → target group `kiet-backend-tg`
6. **Create** — wait ~5 minutes

✅ Test: `http://kiet-backend-alb-1234.ap-south-1.elb.amazonaws.com/docs`

---

## 🪣 PHASE 8 — S3 Bucket for File Uploads

### Step 24: Create the Uploads Bucket

```powershell
# Create bucket (name must be globally unique)
aws s3 mb s3://kiet-exams-uploads --region ap-south-1

# Enable versioning (protects exam submissions from accidental deletion)
aws s3api put-bucket-versioning `
  --bucket kiet-exams-uploads `
  --versioning-configuration Status=Enabled

# Keep bucket PRIVATE — the backend accesses it via IAM role, not public URLs
# Do NOT set a public bucket policy for this bucket
```

---

## 🌐 PHASE 9 — Deploy Frontend to S3 + CloudFront

### Step 24.5: Secure Backend API with CloudFront (HTTPS)

*Modern browsers block HTTP API calls from HTTPS frontends (Mixed Content error). We fix this by putting CloudFront in front of the Load Balancer to get a free HTTPS URL.*

1. AWS Console → **CloudFront** → **Create distribution**
2. **Origin domain:** Select your Load Balancer (e.g., `kiet-backend-alb-...`)
3. **Protocol:** HTTP only
4. **Viewer protocol policy:** Redirect HTTP to HTTPS
5. **Allowed HTTP methods:** Select `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE` (Critical for API!)
6. **Cache key and origin requests:** Select **Cache policy and origin request policy**
   - **Cache policy:** Select `CachingDisabled`
   - **Origin request policy:** Select `AllViewerAndCloudFrontHeaders-2022-06`
7. **Create distribution** and note the domain (e.g., `https://d9876xyz.cloudfront.net`)

### Step 25: Update Frontend API URL

Edit `c:\Users\Techn\Downloads\ML Exam Site\frontend\.env`:

```
# Use your new Backend CloudFront URL here
VITE_API_BASE_URL=https://d9876xyz.cloudfront.net
```

### Step 26: Build the Frontend

```powershell
cd "c:\Users\Techn\Downloads\ML Exam Site\frontend"
npm run build
# This creates a dist/ folder
```

### Step 27: Create Frontend S3 Bucket

```powershell
aws s3 mb s3://kiet-exams-portal --region ap-south-1

# Disable Block Public Access (required for static website hosting)
aws s3api put-public-access-block `
  --bucket kiet-exams-portal `
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Enable static website hosting
aws s3 website s3://kiet-exams-portal --index-document index.html --error-document index.html
```

Create a file `bucket-policy.json` on your Desktop:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::kiet-exams-portal/*"
    }
  ]
}
```

```powershell
aws s3api put-bucket-policy --bucket kiet-exams-portal --policy file://C:\Users\Techn\Desktop\bucket-policy.json

# Upload built frontend
aws s3 sync "c:\Users\Techn\Downloads\ML Exam Site\frontend\dist" s3://kiet-exams-portal --delete
```

### Step 28: Create CloudFront Distribution

1. AWS Console → **CloudFront** → **Create distribution**
2. **Origin domain:** Select `kiet-exams-portal.s3-website.ap-south-1.amazonaws.com` (the S3 website endpoint)
3. **Origin protocol policy:** HTTP only
4. **Viewer protocol policy:** Redirect HTTP to HTTPS
5. **Default root object:** `index.html`
6. **Custom error responses** → Create two:
   - 403 → `/index.html` → HTTP 200
   - 404 → `/index.html` → HTTP 200
7. **Create distribution** → Wait ~15 min
8. Note your **Distribution domain name**: `d1234abcxyz.cloudfront.net`

### Step 29: Update CORS with CloudFront Domain

Go back to **Secrets Manager** → `kiet-exams/production` → **Edit** → update:

- `ALLOWED_ORIGINS` = `https://d1234abcxyz.cloudfront.net`

Then force ECS to pick up the new secret:

```powershell
aws ecs update-service --cluster kiet-exams-cluster --service kiet-backend-service --force-new-deployment --region ap-south-1
```

---

## ✅ PHASE 10 — Final Production Checklist

| #   | Task                                               | Done? |
| --- | -------------------------------------------------- | ----- |
| 1   | AWS IAM user created, CLI configured               | ☐     |
| 2   | RDS PostgreSQL instance running (`available`)      | ☐     |
| 3   | Data migrated from Supabase to RDS                 | ☐     |
| 4   | ElastiCache Redis cluster running (`available`)    | ☐     |
| 5   | `database.py` updated (NullPool → connection pool) | ☐     |
| 6   | `storage.py` updated with real S3 implementation   | ☐     |
| 7   | `boto3` added to `requirements.txt`                | ☐     |
| 8   | CORS updated to use env var `ALLOWED_ORIGINS`      | ☐     |
| 9   | `Dockerfile` and `.dockerignore` created           | ☐     |
| 10  | Docker image built and pushed to ECR               | ☐     |
| 11  | All secrets stored in Secrets Manager              | ☐     |
| 12  | New strong `SECRET_KEY` generated                  | ☐     |
| 13  | ECS cluster, task definition, service running      | ☐     |
| 14  | ALB health check passing (green)                   | ☐     |
| 15  | RDS + Redis accessible from ECS (security groups)  | ☐     |
| 16  | S3 uploads bucket created (private)                | ☐     |
| 17  | Frontend `.env` updated with ALB URL               | ☐     |
| 18  | Frontend built (`npm run build`)                   | ☐     |
| 19  | Frontend S3 bucket with static hosting             | ☐     |
| 20  | CloudFront distribution live                       | ☐     |
| 21  | `ALLOWED_ORIGINS` updated to CloudFront domain     | ☐     |
| 22  | ECS force-redeployed with latest secrets           | ☐     |
| 23  | Login, exam, and file upload tested end-to-end     | ☐     |

---

## 🔄 How to Redeploy After Code Changes

### Backend Update:

```powershell
cd "c:\Users\Techn\Downloads\ML Exam Site\backend"
docker build -t kiet-backend .
docker tag kiet-backend:latest "$ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/kiet-exams-backend:latest"
docker push "$ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/kiet-exams-backend:latest"
aws ecs update-service --cluster kiet-exams-cluster --service kiet-backend-service --force-new-deployment --region ap-south-1
```

### Frontend Update:

```powershell
cd "c:\Users\Techn\Downloads\ML Exam Site\frontend"
npm run build
aws s3 sync dist/ s3://kiet-exams-portal --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## 💰 Estimated Monthly Cost

| Service                                 | Spec                      | Est. Cost/month                     |
| --------------------------------------- | ------------------------- | ----------------------------------- |
| **RDS PostgreSQL**                      | `db.t3.medium`, 20 GB gp3 | ~$35–40                             |
| **ElastiCache Redis**                   | `cache.t3.micro`          | ~$13                                |
| **ECS Fargate** (2 tasks, 1 vCPU, 2 GB) | Always on                 | ~$30–35                             |
| **Application Load Balancer**           | Always on                 | ~$16                                |
| **S3** (frontend + uploads)             | ~20 GB                    | ~$2                                 |
| **CloudFront**                          | ~50 GB transfer           | ~$4                                 |
| **Secrets Manager**                     | 8 secrets                 | ~$1                                 |
| **Total**                               |                           | **~$100–110/month (~₹8,500/month)** |

> [!TIP]
> **Save money:** Stop ECS tasks to 0 outside exam periods and scale up to 4–5 tasks on exam day. RDS and ElastiCache can also be stopped when not in use (AWS RDS supports "Stop temporarily" for up to 7 days).

---

## 🆘 Troubleshooting

| Problem                                  | Solution                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| ECS task keeps restarting                | CloudWatch Logs → `/ecs/kiet-backend` — read the exact error                            |
| 502 Bad Gateway from ALB                 | FastAPI crashed — check ECS task logs in CloudWatch                                     |
| `could not connect to server` (DB error) | RDS security group not allowing ECS subnet CIDR on port 5432                            |
| Redis connection refused                 | ElastiCache security group not allowing port 6379 from ECS                              |
| Frontend routes return 404               | CloudFront custom error pages not set → 403/404 must return `/index.html` with HTTP 200 |
| CORS error in browser                    | `ALLOWED_ORIGINS` in Secrets Manager doesn't match exact CloudFront domain              |
| S3 upload fails                          | ECS task role missing `AmazonS3FullAccess` — check IAM role                             |
| Login works but session breaks           | `SECRET_KEY` env var not being loaded — verify task definition env mapping              |
| `NullPool` warning in logs               | Update `database.py` as described in Phase 3 Step 10                                    |
