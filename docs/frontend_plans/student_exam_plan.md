# Secure Student Dashboard & Exam Environment Plan (Final Architecture)

This plan outlines the architecture for a mathematically secure, tamper-proof student dashboard and exam environment. It strictly enforces role-based access, prevents URL-bypassing of the exam passkey, and introduces advanced anti-cheat mechanics.

## 1. Security Architecture (The "No-Bypass" System)

To mathematically eliminate spoofing, we will use **Cryptographic Exam Session Tokens**. The backend will issue a signed JWT upon passkey verification, which must be attached to all subsequent exam-related requests.

### A. The Cryptographic Handshake (Frontend Flow)
1. The student enters the passkey. The frontend receives the real, cryptographically signed `exam_token` and saves it in `sessionStorage`.
2. When the student navigates to `/exam/123`, `ExamGuard` reads the token.
3. The frontend immediately makes a lightweight ping to the backend using this token.
4. **The Trap**: If a student fakes the token in `sessionStorage`, the backend will instantly reject it (because the cryptographic signature won't match). The frontend will catch this `401/403` error and forcefully kick the student back to the dashboard, logging the bypass attempt.

### B. Instructions for Backend Developer
To implement the cryptographic handshake, please make the following backend modifications:

1. **Update `POST /users/me/exams/{exam_id}/verify-code`**:
   - Currently, it returns `{"success": True, "status": enrollment.status}`.
   - **Change**: When the access code is correct, generate a new signed JWT (`exam_token`). 
   - **Payload**: Include `user_id`, `exam_id`, and set the `exp` (expiration time) to roughly the exam's duration plus a small buffer.
   - **Return**: `{"success": True, "status": enrollment.status, "exam_token": "<signed_jwt>"}`.

2. **Create a new FastAPI Dependency (`dependencies.py`)**:
   - Create a dependency `get_valid_exam_token(x_exam_token: str = Header(...))` or similar.
   - It should decode the token using the system `SECRET_KEY`, verify the `user_id` matches the `current_user`, and ensure the `exam_id` in the token matches the path parameter.

3. **Protect Exam Endpoints**:
   - Apply this new dependency to all routes that interact with an active exam.
   - Specifically: `POST /users/me/exams/{exam_id}/upload`, `POST /users/me/exams/{exam_id}/submit`, and any endpoints used to fetch the exam questions.

## 2. Advanced Anti-Cheat Mechanics

### A. Tab-Switching Tracker (Visibility API)
- We will attach an event listener to the `visibilitychange` API.
- If the student switches tabs, minimizes the browser, or opens another app, the screen will lock with a red warning overlay, and the violation will be logged to the backend.

### B. "Internal-Only" Copy & Paste
- We will intercept the global `copy` and `paste` browser events inside the Exam Environment.
- **On Copy**: We prevent the default browser copy and instead save the selected text to a secure, internal React state/variable (`internalClipboard`).
- **On Paste**: We prevent the default browser paste (blocking them from pasting code from ChatGPT or external sites). Instead, we manually insert the contents of `internalClipboard` into their cursor position.
- **Result**: They can easily copy and paste *within* the exam environment to move their own code around, but pasting anything from outside the window is mathematically impossible.

## 3. Redesigned Student Dashboard (`Dashboard.jsx`)

### Design & Layout (Apple-Inspired)
- **Background**: Soft `var(--bg-base)` with subtle glassmorphic floating elements.
- **Tabs**: Smooth, pill-shaped segmented controls for `Ongoing`, `Upcoming`, and `Completed` exams.
- **Exam Cards**: Premium frosted-glass cards with subtle hover lift. Shows Exam Name, Code, Duration, and a dynamic status badge.
- **Passkey Modal**: A beautifully blurred overlay (`backdrop-filter: blur(24px)`) containing the custom 6-digit OTP input.

## 4. Redesigned Exam Environment (`ExamEnvironment.jsx`)

### Design & Layout (Apple-Inspired)
- **Sidebar (Left)**: A collapsible, glassmorphic sidebar containing:
  - Navigation icons: 📄 Question, 💻 Coding, ☁️ Result (Upload).
  - A highly visible, sticky countdown timer at the bottom. If under 10 minutes, it pulses red.
- **Main Content Area (Right)**:
  - **Question View**: Renders the markdown question beautifully using the `@uiw/react-md-editor` viewer.
  - **Result View**: Two sleek drag-and-drop zones for `.csv` and `.ipynb` files. *(Limits: 5MB for CSV, 15MB for Notebook)*.
  - **Submission**: A prominent "Finalize Submission" button. When the timer hits 0, it auto-locks the screen and initiates a forced submission.
