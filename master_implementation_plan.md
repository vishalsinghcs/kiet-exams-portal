# KIET Exams - Master Implementation Plan

This document outlines the architecture and implementation strategy for the college's secure Machine Learning Examination SPA. The system is designed to handle 1000+ concurrent users, enforce strict security policies (single-device session), and seamlessly integrate a Jupyter-lite environment with automated grading.

## User Review Required

> [!IMPORTANT]
> **Backend Framework**: I am proposing **Python (FastAPI)** for the backend instead of Node.js. Since your professor's scoring and ranking code is written in Python, using a Python backend allows us to natively import and run his code without complex inter-process communication or microservices. FastAPI is extremely fast and easily handles 1000+ concurrent connections.

> [!IMPORTANT]
> **Database Architecture**: I propose using **PostgreSQL** for reliable data storage (students, submissions, scores) and **Redis** for session management. Redis is crucial for the "single session per student" requirement, as it allows us to instantly invalidate old sessions across the entire system when a user logs in from a new device.

> [!WARNING]
> **Styling Approach**: Per system guidelines, I will use pure **Vanilla CSS** with CSS Variables (Custom Properties) instead of TailwindCSS. This ensures maximum flexibility, clean markup, and allows us to create highly customized, smooth, and premium micro-animations.

## Proposed Changes

---

### 1. Architecture & Tech Stack

- **Frontend**: React (via Vite) + Vanilla CSS. We will use `framer-motion` to implement the required smooth, fluid responsive animations and professional interactive elements.
- **Backend**: FastAPI (Python) for high performance and native Python integration.
- **Database**: PostgreSQL (Relational Data) + Redis (Session State).
- **Cloud Hosting (AWS)**: 
  - **Frontend**: AWS S3 + CloudFront (CDN for fast, global delivery).
  - **Backend**: AWS ECS (Elastic Container Service) with AWS Fargate for auto-scaling under load.
  - **Database**: AWS RDS (PostgreSQL) + Amazon ElastiCache (Redis).
  - **File Storage**: AWS S3 (Secure storage for uploaded `.ipynb` and `.csv` files).

---

### 2. Core Features Implementation

#### Authentication & Session Management (Phase 1)
- **Signup/Login**: Implement JWT-based authentication. 
- **Domain Restriction**: Enforce regex validation on the backend and frontend to ensure emails end exactly with `@kiet.edu`.
- **Single Active Session**: 
  - Upon login, a unique `session_token` is generated and stored in Redis with the user's ID as the key.
  - The token is sent to the client as an `HttpOnly` cookie.
  - If a student logs in on a second device, the Redis key is overwritten with a new token.
  - When the first device makes its next request, the backend will see the token doesn't match Redis and will return a `401 Unauthorized`, instantly logging them out.
- **Exam Day Constraint**: An automatic date check will be implemented on the backend. The backend will have a configured "Exam Date" variable. If the current server time matches the Exam Date, all signup endpoints will automatically return an error, and only logins will be permitted.

#### The Exam Environment (Frontend) (Phase 2)
- **Iframe Integration**: The professor's site (`https://piyushmtech2252.github.io/ML_ARENA/lab/index.html`) will be embedded using a full-screen `<iframe>` (`width: 100vw; height: 100vh; border: none;`). It will feel like a native part of the app.
- **Floating Action Button (FAB)**: A sleek, dynamically animated floating button positioned in the bottom-right corner. It will use pulse and hover animations to guide the user's attention.
- **Submission Modal**: Clicking the FAB triggers a glassmorphic modal overlay (animated via Framer Motion) allowing the student to browse their local files and upload the `.ipynb` and `.csv`.

#### Submission & Scoring (Backend) (Phase 3)
*Note: The exact details of the professor's Python code integration will be implemented after the Phase 1 login system is fully functioning and verified.*
- A dedicated API endpoint will accept multipart form data for the file uploads.
- The backend will upload the raw files directly to a secure AWS S3 bucket.
- **Utilizing the Professor's Code**: The FastAPI backend will load the submitted CSV and pass it to the professor's Python function. The resulting score will be securely saved to the PostgreSQL database.

#### Live Leaderboard (Phase 4)
- A dedicated route (e.g., `/leaderboard`) featuring a Kaggle-style data table.
- Smooth entering animations for rows.
- The backend will serve aggregated high scores per student.

---

## Verification Plan

### Automated Tests
- **Load Testing**: We will use `locust` (a Python-based load testing tool) to simulate 1,000 concurrent students logging in, fetching the iframe, and submitting files. This ensures the AWS architecture and FastAPI can handle the peak load.
- **Unit Tests**: Test the authentication logic to verify that non-kiet.edu emails are rejected and the automatic exam day signup block works seamlessly.

### Manual Verification
- **Session Eviction**: Log in on Browser A, then log in on Browser B. Verify that Browser A is immediately kicked to the login screen on its next action.
- **UI/UX**: Verify all Framer Motion animations feel premium and the iframe fully covers the screen without double scrollbars.
- **Integration Check**: After login is completed and the professor's code is integrated, upload a dummy CSV and ensure the scoring script returns the correct output to the UI leaderboard.
