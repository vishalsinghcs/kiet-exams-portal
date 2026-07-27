<div align="center">
  <h1>CodeML - KIET Exams Portal</h1>
  <p><b>A highly secure, scalable, and enterprise-grade Machine Learning Examination Platform</b></p>
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Python-14354C?style=flat&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis" />
    <img src="https://img.shields.io/badge/Amazon_AWS-232F3E?style=flat&logo=amazon-aws&logoColor=white" alt="AWS" />
    <img src="https://img.shields.io/badge/OpenTelemetry-000000?style=flat&logo=opentelemetry&logoColor=white" alt="OpenTelemetry" />
    <img src="https://img.shields.io/badge/New_Relic-008C99?style=flat&logo=newrelic&logoColor=white" alt="New Relic" />
    <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white" alt="GitHub Actions" />
  </p>
</div>

## Overview

KIET Exams Portal is a production-ready, highly secure Single Page Application (SPA) designed to conduct Machine Learning examinations for over 1000+ concurrent students. The platform seamlessly embeds a local Jupyter-lite environment directly into the browser and integrates automated Python grading systems on the backend. This creates a robust, Kaggle-style competitive testing environment tailored for academic excellence.

## Core Engineering Feats

- **Strict Single-Device Concurrency Model**: Implementing an enterprise-grade security layer using **Redis** to enforce a strict single-active-session policy. Logging into a new device instantly invalidates all previous sessions, guaranteeing exam integrity.
- **Embedded Jupyter-Lite Architecture**: Delivering a full-screen, native-feeling Jupyter notebook experience via embedded `iframe`s running entirely within the client's browser for maximum performance and zero server-side compute overhead.
- **Automated ML Model Grading pipeline**: Seamless backend integration with native Python execution via **FastAPI**, instantly ingesting student `.csv` predictions and scoring them using custom professor-provided ML evaluation algorithms.
- **Role-Based Access Control (RBAC)**: A comprehensive, multi-tiered permission system strictly separating privileges among `Admin`, `Teacher`, and `Student`. 

## Architecture Deep Dive

The platform is designed around a modern, decoupled microservices-inspired architecture that prioritizes massive concurrency, high availability, and ultra-low latency.

### 1. The Frontend Layer
Built on **React + Vite**, the frontend uses strict functional components and state management. 
- **Delivery**: Compiled assets are stored in an **AWS S3 bucket** and globally distributed via **AWS CloudFront (CDN)**, ensuring sub-100ms load times for students worldwide.
- **Admin Dashboard**: An Apple UI inspired interface offering rich markdown editing (via `@uiw/react-md-editor`), live previews, section-based bulk exam assignments, and dataset (ZIP/CSV) uploads.

### 2. The Backend Layer
Powered by **FastAPI (Python)**. Since the scoring algorithms are natively written in Python, FastAPI allows seamless, in-memory execution of these scripts without relying on inter-process communication.
- **Compute Infrastructure**: Hosted on **AWS Elastic Container Service (ECS)** with multiple tasks to automatically scale the backend tasks horizontally based on traffic spikes.
- **Reverse Proxy / Load Balancing**: Traffic is intelligently routed via an **Application Load Balancer (ALB)**, sitting behind CloudFront to secure API endpoints with modern HTTPS standards.

### 3. The Data Persistence Layer
- **PostgreSQL (AWS RDS)**: The primary relational database utilized for user profiles, exam metadata, and persistent score tracking. Configured with native SQLAlchemy connection pooling (`pool_size=10`, `max_overflow=20`) to gracefully handle high connection throughput.
- **Redis (AWS ElastiCache)**: An in-memory key-value store utilized as the volatile session manager, responsible for ultra-fast token invalidation and real-time state consistency.
- **AWS S3**: Secure, private blob storage for `.zip` datasets and student `.csv` predictions. 

## Security & Exam Integrity

- **Restricted Registrations**: Enforces server-side regex validation, allowing only authorized college domains (`@kiet.edu`).
- **Time-Gated Access**: Backend validation automatically rejects registrations and only permits logins on configured "Exam Days" for students.
- **Dynamic Access Codes**: Exam execution is protected by teacher-distributed 6-digit OTP codes.

## Observability & Monitoring

To maintain high reliability during critical exam windows, the platform incorporates enterprise-grade observability:
- **OpenTelemetry**: Used to instrument distributed tracing across the frontend, backend, and database queries.
- **New Relic**: Centralized dashboarding for comprehensive logging, metric collection, and Application Performance Monitoring (APM). Identifies latency bottlenecks and monitors system health in real-time.

## CI/CD Pipeline & Deployment

The portal follows modern DevOps principles, utilizing **GitHub Actions** for continuous integration and continuous deployment (CI/CD):

- **Automated Testing**: Whenever a `push` or `merge` occurs on the `main` branch, the pipeline automatically spins up and executes a comprehensive suite of unit and integration tests.
- **Manual Trigger Deployments**: For production deployments, a manual dispatch trigger is employed. By inputting `start` in the GitHub Actions deployment script, the workflow builds the Docker images, pushes them to AWS ECR, updates ECS Fargate services, builds the frontend, and invalidates the CloudFront cache—automating the entire AWS deployment lifecycle.

## License
Proprietary software developed for internal academic examination purposes. All rights reserved.
