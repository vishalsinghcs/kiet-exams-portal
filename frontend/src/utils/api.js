// src/utils/api.js
// Central API client — all backend calls go through here
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Login
 */
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data;
}

/**
 * Step 1: Request Signup OTP
 */
export async function signupUser(name, email, password, branch, section, registrationNumber) {
  const res = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, branch, section, registration_number: registrationNumber }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Signup failed");
  return data;
}

/**
 * Step 2: Verify Signup OTP & Login
 */
export async function verifyOtp(name, email, password, branch, section, registrationNumber, otp) {
  const res = await fetch(`${API_BASE_URL}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, branch, section, registration_number: registrationNumber, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Verification failed");
  return data;
}

/**
 * Step 1: Request Password Reset OTP
 */
export async function forgotPassword(email) {
  const res = await fetch(`${API_BASE_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to send reset link");
  return data;
}

/**
 * Step 2: Submit new password with OTP
 */
export async function resetPassword(email, otp, newPassword) {
  const res = await fetch(`${API_BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Reset failed");
  return data;
}
