const BASE_URL = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// --- Auth ---
export async function registerUser(name, email, password) {
  const response = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Registration failed");
  }
  return await response.json();
}

export async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Login failed");
  }
  return await response.json();
}

export async function linkGmail(gmail_address, gmail_app_password) {
  const response = await fetch(`${BASE_URL}/link-email`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ gmail_address, gmail_app_password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to link Gmail");
  }
  return await response.json();
}

// --- Emails ---
export async function getEmails() {
  const response = await fetch(`${BASE_URL}/emails`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch emails");
  const data = await response.json();
  return data.emails;
}

export async function getEmailById(id) {
  const response = await fetch(`${BASE_URL}/emails`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch emails");
  const data = await response.json();
  return data.emails.find((email) => email.id === Number(id)) || null;
}

export async function syncEmails() {
  const response = await fetch(`${BASE_URL}/sync-emails`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to sync emails");
  }
  return await response.json();
}