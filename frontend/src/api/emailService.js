const BASE_URL = "http://localhost:8000";

// Fetch all emails stored in the database
export async function getEmails() {
  const response = await fetch(`${BASE_URL}/emails`);
  if (!response.ok) throw new Error("Failed to fetch emails");
  const data = await response.json();
  return data.emails;
}

// Fetch a single email by ID
export async function getEmailById(id) {
  const response = await fetch(`${BASE_URL}/emails`);
  if (!response.ok) throw new Error("Failed to fetch emails");
  const data = await response.json();
  return data.emails.find((email) => email.id === Number(id)) || null;
}

// Trigger Gmail fetch + analysis + store to DB
export async function syncEmails() {
  const response = await fetch(`${BASE_URL}/store-emails`, { method: "POST" });
  if (!response.ok) throw new Error("Failed to sync emails");
  return await response.json();
}

// Trigger analysis only (no DB store)
export async function analyzeEmails() {
  const response = await fetch(`${BASE_URL}/analyze-emails`);
  if (!response.ok) throw new Error("Failed to analyze emails");
  return await response.json();
}
