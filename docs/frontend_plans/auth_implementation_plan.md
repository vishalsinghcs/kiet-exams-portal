# Authentication Pages Implementation Plan

This plan details the procedure for rebuilding the authentication flow (Login, Signup, Forgot Password) and the Landing Page in `frontend-new` using the new Apple-inspired design system.

## User Review Required
> [!IMPORTANT]
> The old auth pages used a split-pane layout (left side mesh background, right side form). For the new Apple-inspired design, I propose using a **centered, floating glassmorphic card** overlaid on top of the animated `BackgroundOrb`. This provides a much more premium, modern, and focused feel. Please review this decision in the Open Questions below.

## Open Questions
> [!WARNING]
> 1. **Layout Choice**: Do you prefer the new centered floating glass card for login/signup, or do you strictly want to keep the 50/50 left/right split-pane layout but with the new styling?
> 2. **Dropdowns**: The Signup page requires dropdowns (Year, Branch, Section). Would you like me to build a custom `Select.jsx` component that perfectly matches the Apple aesthetic (glass background, soft borders), or use standard native HTML `<select>` tags with basic styling for now?

## Proposed Changes

### 1. Shared Auth Layout
#### [NEW] `frontend-new/src/components/layout/AuthLayout.jsx`
- A reusable layout specifically for authentication pages.
- Will render the `BackgroundOrb` behind everything.
- Will provide a centered layout container (or split-pane if requested) with smooth fade-in CSS animations (since `framer-motion` was removed).

### 2. Form Components
#### [MODIFY] `frontend-new/src/components/ui/Input.jsx`
- Enhance the `Input` component to support an `endIcon` (e.g., an eye icon for toggling password visibility).

#### [NEW] `frontend-new/src/components/ui/Select.jsx` (Optional)
- Depending on your answer to the open question, create a custom stylized dropdown component for the Signup form.

### 3. Page Implementations

#### [NEW] `frontend-new/src/components/LandingPage.jsx`
- Replace the old landing page with a sleek placeholder.
- Will feature the `BackgroundOrb` and a beautifully typography-focused "Under Construction" message.

#### [NEW] `frontend-new/src/components/Login.jsx`
- **UI**: Glassmorphic card containing KIET Email and Password fields.
- **Logic**: Exact 1:1 migration. Calls `loginUser`, checks `/users/me` for role, and redirects to `/admin/dashboard` or `/dashboard` based on the role.

#### [NEW] `frontend-new/src/components/Signup.jsx`
- **UI**: Glassmorphic card with a smooth CSS transition between Step 1 and Step 2.
- **Logic**: 
  - Step 1: Collects Name, @kiet.edu Email, Reg No, Year, Branch, Section, Password. Validates exactly as before (15 digits, etc.).
  - Step 2: Collects 6-digit OTP, handles countdown timer and resend logic.

#### [NEW] `frontend-new/src/components/ForgotPassword.jsx`
- **UI**: Glassmorphic card.
- **Logic**: 
  - Step 1: Sends OTP to @kiet.edu email.
  - Step 2: Verifies OTP, checks matching passwords, enforces min length (6), and resets.

---

## Verification Plan

### Manual Verification
1. **Visual QA**: Ensure all auth pages render beautifully with the new CSS theme and animations without `framer-motion`.
2. **Functional QA (Login)**: Test student login and admin login to verify routing correctly hits `/dashboard` and `/admin/dashboard`.
3. **Functional QA (Signup)**: Test branch/section logic (e.g., "Minor Degree" forces section "A") and verify OTP flow.
4. **Functional QA (Forgot Password)**: Test the OTP and password reset flow.
