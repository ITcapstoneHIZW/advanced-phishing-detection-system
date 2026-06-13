import React from "react";
import { Link, useNavigate } from "react-router-dom";
import I from "../components/Icons";
import { BrandMark } from "../components/Ui";

// Terms & Conditions content. Authored by the APDS team (Zayyan Saleh).
// Rendered as a standalone page linked from the register checkbox and footer.
const SECTIONS = [
  {
    h: "1. Acceptance of Terms",
    body: [
      "By registering an account and using the Sentinel Advanced Phishing Detection System (\"Sentinel\", \"the Service\", \"the Application\"), you (\"the User\") agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the Service.",
      "These Terms and Conditions apply to all users of Sentinel, including users who link email accounts, interact with analysis results, or access any part of the Service.",
    ],
  },
  {
    h: "2. Description of Service",
    body: [
      "Sentinel is an academic software application developed as a capstone project at Victoria University. It is designed to assist users in identifying potentially malicious phishing emails by:",
      ["Connecting to the user's Gmail and/or Microsoft Outlook accounts via secure OAuth 2.0 authentication",
       "Retrieving email messages and analysing them for phishing indicators",
       "Assigning a risk score and verdict to each email using rule-based logic and a trained machine learning model",
       "Presenting analysis results through a web-based dashboard"],
      "Sentinel is provided for educational and research purposes. It is a prototype system developed in an academic context and is not a commercial product.",
    ],
  },
  {
    h: "3. User Accounts",
    sub: [
      { h: "3.1 Registration", body: ["You must register an account to use Sentinel. You agree to provide accurate and complete information during registration, including your name and a valid email address."] },
      { h: "3.2 Account Security", body: ["You are responsible for maintaining the confidentiality of your account password. You agree to:", ["Use a password that is reasonably secure", "Not share your account credentials with others", "Notify the development team immediately if you become aware of any unauthorised access to your account"]] },
      { h: "3.3 Account Termination", body: ["You may delete your account at any time from the Account settings page. The development team reserves the right to suspend or terminate accounts that violate these Terms and Conditions."] },
    ],
  },
  {
    h: "4. Linking Email Accounts",
    sub: [
      { h: "4.1 OAuth Authorisation", body: ["Sentinel connects to Gmail and Microsoft Outlook using OAuth 2.0, an industry-standard authorisation protocol. By linking an email account you grant Sentinel permission, for Gmail and Microsoft Outlook respectively, to read your email messages and view your email address and account profile."] },
      { h: "4.2 What Sentinel Does With Email Access", body: ["Sentinel uses your email access solely to retrieve email messages for phishing analysis, extract features from email content (sender, subject, body text, URLs), and store the analysis results in the Sentinel database under your account.", "Sentinel does not read emails for any purpose other than phishing analysis, forward, share, or sell email content to any third party, send emails on your behalf, or modify, move, or delete emails from your inbox."] },
      { h: "4.3 Revoking Access", body: ["You may unlink any email account at any time from the Link Email page. You may also revoke Sentinel's access directly through your Google account settings (myaccount.google.com) or Microsoft account settings at any time."] },
    ],
  },
  {
    h: "5. Data Collection and Storage",
    sub: [
      { h: "5.1 What Data Sentinel Collects", body: ["Sentinel collects and stores account information (name, email address, hashed password, account creation date), linked email account details (email address, provider, OAuth access and refresh tokens), email metadata and content (sender, subject, body text, date received), analysis results, sensitivity settings, and audit logs of significant actions."] },
      { h: "5.2 How Data is Stored", body: ["All data is stored in a PostgreSQL database hosted on Railway, a cloud infrastructure platform. Data is stored in the jurisdiction provided by the Railway platform. The development team takes reasonable steps to protect stored data but cannot guarantee absolute security."] },
      { h: "5.3 OAuth Tokens", body: ["OAuth access tokens and refresh tokens are stored in the database to allow Sentinel to fetch emails on your behalf during a sync. These tokens are stored and transmitted over encrypted HTTPS connections. You can invalidate these tokens at any time by unlinking the account in Sentinel or by revoking access through your Google or Microsoft account settings."] },
      { h: "5.4 Passwords", body: ["User passwords are never stored in plain text. All passwords are hashed using bcrypt before storage. The original password cannot be recovered from the stored hash."] },
      { h: "5.5 Data Retention", body: ["Your data is retained in Sentinel's database for as long as your account is active. Deleting your account permanently removes all associated data including linked accounts, synced emails, analysis results, and audit logs."] },
    ],
  },
  {
    h: "6. Privacy",
    sub: [
      { h: "6.1 No Sale of Data", body: ["Sentinel does not sell, trade, or transfer user data or email content to any third parties."] },
      { h: "6.2 Academic Context", body: ["Sentinel is an academic prototype. Aggregate, anonymised information about system performance (e.g. detection rates, false positive rates) may be used by the development team for academic reporting and assessment purposes. Individual email content or personally identifiable information will not be included in any academic reporting."] },
      { h: "6.3 Third-Party Services", body: ["Sentinel integrates with the Google Gmail API, the Microsoft Graph API, and Railway for hosting and database storage. Your use of these integrations is subject to the respective privacy policies and terms of those providers."] },
    ],
  },
  {
    h: "7. Accuracy and Limitations",
    sub: [
      { h: "7.1 No Guarantee of Detection", body: ["Sentinel uses rule-based analysis and a machine learning model to detect phishing emails. No phishing detection system is 100% accurate. Sentinel may fail to detect a phishing email (false negative) or incorrectly flag a legitimate email as phishing (false positive). The risk scores and verdicts provided are informational only and should not be relied upon as the sole basis for determining whether an email is safe or malicious."] },
      { h: "7.2 Not a Substitute for Caution", body: ["Sentinel is a tool to assist in identifying threats, not a replacement for user judgement. You should continue to exercise caution with all emails, particularly those that ask for personal information, login credentials, or payment details, contain unexpected links or attachments, or come from unexpected or unknown senders."] },
      { h: "7.3 Machine Learning Model", body: ["The machine learning model used by Sentinel was trained on a specific dataset of phishing and legitimate emails. Its performance on emails that differ significantly from the training data may vary. The model is provided as-is without warranty of accuracy for any specific email or use case."] },
    ],
  },
  {
    h: "8. Intellectual Property",
    body: [
      "Sentinel and all associated software, design, and content were developed by the APDS Capstone Team at Victoria University as an academic project. All intellectual property rights remain with the development team and the University unless otherwise specified by the University's academic policies.",
      "You may not reproduce, distribute, modify, or create derivative works from Sentinel without written permission from the development team.",
    ],
  },
  {
    h: "9. Prohibited Use",
    body: [
      "You agree not to use Sentinel to:",
      ["Attempt to gain unauthorised access to any system, account, or data",
       "Interfere with the operation of the Service or its infrastructure",
       "Harvest or collect personal data about other users",
       "Upload or submit malicious content",
       "Use the Service for any illegal purpose",
       "Attempt to reverse-engineer or extract the trained machine learning model"],
    ],
  },
  {
    h: "10. Limitation of Liability",
    body: [
      "To the maximum extent permitted by applicable law, the development team and Victoria University shall not be liable for any loss or damage resulting from reliance on Sentinel's phishing verdicts, any failure to detect a phishing email, any loss of data, unauthorised access, or security breach that is outside the development team's reasonable control, or any indirect, consequential, or incidental damages arising from use of the Service.",
      "Sentinel is provided \"as is\" without warranties of any kind, express or implied. Given its academic and prototype nature, the Service may be modified, suspended, or discontinued at any time without notice.",
    ],
  },
  {
    h: "11. Modifications to These Terms",
    body: ["The development team reserves the right to update these Terms and Conditions at any time. Changes will be posted within the application. Continued use of Sentinel after changes are posted constitutes acceptance of the revised terms."],
  },
  {
    h: "12. Governing Law",
    body: ["These Terms and Conditions are governed by the laws of Victoria, Australia. Any disputes arising from the use of Sentinel shall be subject to the jurisdiction of the courts of Victoria, Australia."],
  },
];

function Block({ body }) {
  return (
    <>
      {body.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i} style={{ margin: "0 0 12px", paddingLeft: 20, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {b.map((li, j) => <li key={j} style={{ marginBottom: 4 }}>{li}</li>)}
          </ul>
        ) : (
          <p key={i} style={{ margin: "0 0 12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{b}</p>
        )
      )}
    </>
  );
}

function TermsPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 20px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="row between" style={{ marginBottom: 24, alignItems: "center" }}>
          <div className="row" style={{ alignItems: "center", gap: 10 }}>
            <BrandMark />
            <span style={{ fontWeight: 600 }}>Sentinel</span>
          </div>
          <button className="btn" data-variant="ghost" data-size="sm" onClick={() => navigate(-1)}>
            <I.CornerUpLeft size={14} /> Back
          </button>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Terms and Conditions</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 4px" }}>Advanced Phishing Detection System — Victoria University Capstone Project</p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 28px" }}>Effective Date: June 2026</p>

          {SECTIONS.map((s, i) => (
            <section key={i} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 10px" }}>{s.h}</h2>
              {s.body && <Block body={s.body} />}
              {s.sub && s.sub.map((sub, j) => (
                <div key={j} style={{ marginBottom: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: "var(--text)" }}>{sub.h}</h3>
                  <Block body={sub.body} />
                </div>
              ))}
            </section>
          ))}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
            <Link to="/register" style={{ color: "var(--accent)", fontWeight: 500, fontSize: 14 }}>← Back to registration</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsPage;
