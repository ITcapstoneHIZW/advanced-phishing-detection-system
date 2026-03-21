const mockEmails = [
  {
    id: 1,
    sender: "security@paypaI-alert.com",
    subject: "Urgent: Suspicious login attempt detected",
    risk: "High",
    status: "Quarantined",
    date: "2026-03-20",
    body: "We detected a suspicious login attempt on your PayPal account. Please verify your details immediately by clicking the secure link below.",
  },
  {
    id: 2,
    sender: "support@micr0softverify.com",
    subject: "Password reset required immediately",
    risk: "High",
    status: "Quarantined",
    date: "2026-03-19",
    body: "Your Microsoft account password has expired. Reset it now to avoid account suspension.",
  },
  {
    id: 3,
    sender: "billing@netfIix-billing.com",
    subject: "Payment issue on your subscription",
    risk: "Medium",
    status: "Quarantined",
    date: "2026-03-18",
    body: "Your payment could not be processed. Update your billing details to continue your subscription service.",
  },
  {
    id: 4,
    sender: "alerts@commbank-check.com",
    subject: "Verify your banking details",
    risk: "Medium",
    status: "Quarantined",
    date: "2026-03-17",
    body: "Your bank account information needs verification to prevent temporary suspension.",
  },
];

export default mockEmails;