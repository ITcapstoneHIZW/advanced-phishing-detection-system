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

export async function getMe() {
  const response = await fetch(`${BASE_URL}/me`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch user");
  return await response.json();
}

// --- OAuth ---
export async function startGmailOAuth() {
  const response = await fetch(`${BASE_URL}/auth/gmail`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to start Gmail OAuth");
  return await response.json();
}

export async function saveGmailCredentials(gmail_address, credentials) {
  const response = await fetch(`${BASE_URL}/auth/save-gmail`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ gmail_address, credentials }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to save Gmail credentials");
  }
  return await response.json();
}

export async function startMicrosoftOAuth() {
  const response = await fetch(`${BASE_URL}/auth/microsoft`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to start Microsoft OAuth");
  return await response.json();
}

export async function saveMicrosoftCredentials(email_address, credentials) {
  const response = await fetch(`${BASE_URL}/auth/save-microsoft`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email_address, credentials }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to save Microsoft credentials");
  }
  return await response.json();
}

// --- Linked emails ---
export async function getLinkedEmails() {
  const response = await fetch(`${BASE_URL}/linked-emails`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch linked emails");
  return await response.json();
}

export async function unlinkEmail(id) {
  const response = await fetch(`${BASE_URL}/linked-emails/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to unlink email");
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
  const response = await fetch(`${BASE_URL}/emails/${id}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch email");
  return await response.json();
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

export async function releaseEmail(id) {
  const response = await fetch(`${BASE_URL}/emails/${id}/release`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to release email");
  return await response.json();
}

export async function deleteEmail(id) {
  const response = await fetch(`${BASE_URL}/emails/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete email");
  return await response.json();
}

export async function submitFeedback(id, verdict) {
  const response = await fetch(`${BASE_URL}/emails/${id}/feedback`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ verdict }),
  });
  if (!response.ok) throw new Error("Failed to submit feedback");
  return await response.json();
}

// --- Sensitivity settings ---
export async function getSensitivity() {
  const response = await fetch(`${BASE_URL}/settings/sensitivity`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch sensitivity settings");
  return await response.json();
}

export async function updateSensitivity(threshold, quarantine_type) {
  const response = await fetch(`${BASE_URL}/settings/sensitivity`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ threshold, quarantine_type }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update sensitivity");
  }
  return await response.json();
}

// --- Audit logs ---
export async function getAuditLogs(limit = 100, offset = 0) {
  const response = await fetch(`${BASE_URL}/audit-logs?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch audit logs");
  return await response.json();
}

// --- Account ---
export async function getAccount() {
  const response = await fetch(`${BASE_URL}/account`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch account");
  return await response.json();
}

export async function changePassword(current_password, new_password) {
  const response = await fetch(`${BASE_URL}/account/change-password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ current_password, new_password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to change password");
  }
  return await response.json();
}

export async function deleteAccount() {
  const response = await fetch(`${BASE_URL}/account`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete account");
  return await response.json();
}