// src/utils/api.js
// Central API client — all backend calls go through here
import { API_BASE_URL } from "./constants";

/**
 * Login — sends JSON body with email + password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ access_token: string, token_type: string }>}
 */
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Login failed");
  }
  return data; // { access_token, token_type }
}

/**
 * Signup — JSON body
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ id, name, email, is_active, created_at }>}
 */
export async function signupUser(name, email, password) {
  const res = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Signup failed");
  }
  return data;
}
