# Teacher Authentication Flow (Invitation-Only)

This plan outlines the architecture for the highly secure, spam-free authentication experience for Teachers.

---

## 1. Backend Changes (For Backend Team)
*Note: The AI assistant is only implementing the Frontend. The following are requirements for the backend team to build.*

### A. New Endpoint: `POST /admin/invite-teacher`
- **Purpose**: Allows an Admin to invite a new teacher to the platform.
- **Request Body**: `{"name": "...", "email": "..."}`
- **Logic Required**:
  1. Verify the current user calling the API is an `admin`.
  2. Create a new `User` record in the database with `role = "teacher"`, `is_active = True`, and `password = null` (or a random temporary hash).
  3. Generate a secure time-limited token (e.g., using `VerificationToken` model with type `teacher_invite`).
  4. Send an email to the provided address containing a link: `https://[frontend-url]/teacher/set-password?token=[GENERATED_TOKEN]`.

### B. New Endpoint: `POST /auth/set-teacher-password`
- **Purpose**: Consumes the token from the email link and sets the teacher's password.
- **Request Body**: `{"token": "...", "new_password": "..."}`
- **Logic Required**:
  1. Validate the token exists, is of type `teacher_invite`, and is not expired.
  2. Hash the `new_password` and update the associated teacher's `password_hash`.
  3. Delete the token from the database.
  4. Return a success message.

### C. Security Patch: `dependencies.py`
- **Purpose**: Block API access for unverified or suspended users globally.
- **Action**: In the `get_current_user` function, immediately after fetching the `user` object from the database, add the following check:
  ```python
  if not user.is_active:
      raise HTTPException(status_code=403, detail="Inactive user account")
  ```

### D. Testing: 
- Add tests for the teacher invitation, login and verification system.

---

## 2. Frontend Execution Plan (For AI Assistant)

### A. Routing (`App.jsx`)
- Setup `<Route path="/teacher">` to handle redirects (Dashboard if logged in, Login if not).
- Setup `<Route path="/teacher/login" element={<TeacherLogin />} />`.
- Setup `<Route path="/teacher/set-password" element={<TeacherSetPassword />} />`.

### B. Pages
- **`TeacherLogin.jsx`**: Mirrors the student login page (60/40 glassmorphic split, interactive characters) but points to `/teacher/login` API flow (if different, otherwise standard `/login` handles roles). Has NO signup link.
- **`TeacherSetPassword.jsx`**: A page that extracts `?token=` from the URL, provides two fields ("New Password", "Confirm Password"), and submits to `/auth/set-teacher-password`. 

### C. Services (`api.js`)
- Ensure frontend `api.js` can handle the `set-teacher-password` API call.
