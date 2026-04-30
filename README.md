<div align="center">
  <h1>KIET Exams Portal</h1>
  <p><b>Secure, Scalable Examination Platform</b></p>
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Python-14354C?style=flat&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis" />
    <img src="https://img.shields.io/badge/Amazon_AWS-232F3E?style=flat&logo=amazon-aws&logoColor=white" alt="AWS" />
  </p>
</div>

## Overview

KIET Exams is a highly secure, scalable Single Page Application (SPA) designed to conduct Machine Learning examinations for over 1000 concurrent students. The platform seamlessly integrates a local Jupyter-lite environment with automated grading systems, providing a robust, competition-style testing experience analogous to Kaggle.

## Key Features

- **Strict Session Management**: Enforces a strict single-device policy. Logging in on a new device instantaneously invalidates previous sessions using Redis caching.
- **Secure Authentication**: Restricts registration exclusively to authorized college domain emails. Includes automated constraints for exam day registrations.
- **Embedded ML Environment**: Integrates a full-screen, native-feeling Jupyter notebook environment directly into the web application.
- **Automated Grading Integration**: Direct ingestion of CSV prediction data to a Python-based scoring algorithm.
- **Real-Time Leaderboard**: Dynamically ranks students based on model accuracy, fostering a competitive academic environment.
- **Enterprise-Grade UI/UX**: Features smooth, framer-motion driven fluid animations and a minimalist, professional design language.

## Architecture & Technology Stack

### Frontend

- **Framework**: React with Vite for rapid development and optimized production builds.
- **Styling**: Vanilla CSS with modern CSS variables to maintain high performance and granular control over micro-animations.
- **Animations**: Framer Motion for premium, physics-based UI transitions.

### Backend

- **Framework**: FastAPI (Python) chosen for exceptional asynchronous performance and native compatibility with the automated ML grading scripts.
- **Database**: PostgreSQL for persistent, relational data storage (User profiles, Submissions, Scores).
- **Session Store**: Redis for high-speed, volatile session management and immediate token invalidation.

### Infrastructure (AWS)

- **Content Delivery**: AWS S3 & CloudFront.
- **Application Servers**: AWS Elastic Container Service (ECS) with AWS Fargate.
- **Database Services**: Amazon RDS and ElastiCache.

## Development Setup

_Instructions for local development and deployment will be added as the project progresses._

## License

Proprietary software developed for internal academic examination purposes.
