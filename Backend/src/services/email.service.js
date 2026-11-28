import nodemailer from "nodemailer";
import config from "../config/config.js";

/**
 * Configure Nodemailer SMTP Transporter
 */
const getSmtpConfig = () => {
  const host = config.SMTP_HOST;
  const port = Number(config.SMTP_PORT);
  const secure = config.SMTP_SECURE;
  const user = config.SMTP_EMAIL;
  const pass = config.SMTP_APP_PASSWORD;

  const smtpOptions = {
    host,
    port,
    secure,
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 5000, // 5s greeting timeout
    socketTimeout: 15000, // 15s socket inactivity timeout
  };

  if (user && pass) {
    smtpOptions.auth = {
      user,
      pass,
    };
  }

  return smtpOptions;
};

export const transporter = nodemailer.createTransport(getSmtpConfig());

/**
 * Diagnostic check for SMTP connection.
 * Safely verifies connection without crashing the application on startup.
 * Never leaks credentials in error logs or output.
 * @returns {Promise<{ connected: boolean, message: string, error?: string }>}
 */
export const verifyTransporter = async () => {
  const user = config.SMTP_EMAIL;

  if (!user) {
    return {
      connected: false,
      message:
        "SMTP user credentials (SMTP_USER / SMTP_EMAIL) not configured. Email sending is dormant.",
    };
  }

  try {
    await transporter.verify();
    return {
      connected: true,
      message: "SMTP server connection verified successfully.",
    };
  } catch (err) {
    // Sanitize any potential credential leakage in error message
    const sanitizedMsg = (err.message || "").replace(
      /([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/g,
      "***@***.***",
    );
    return {
      connected: false,
      message: `SMTP connection failed: ${sanitizedMsg}`,
      error: sanitizedMsg,
    };
  }
};

/**
 * Backward compatibility alias for verifyTransporter
 */
export const verifyEmailConnection = verifyTransporter;

/**
 * Send an email using the configured SMTP transport
 * Reusable email service without database or invitation-specific logic.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content fallback
 * @returns {Promise<{ success: boolean, messageId: string|null, error: string|null }>}
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    const errorMsg = "Recipient email (to) is required.";
    console.error(`[Email Service Error] ${errorMsg}`);
    return { success: false, messageId: null, error: errorMsg };
  }
  if (!subject) {
    const errorMsg = "Email subject is required.";
    console.error(`[Email Service Error] ${errorMsg}`);
    return { success: false, messageId: null, error: errorMsg };
  }
  if (!html && !text) {
    const errorMsg = "Email content (html or text) is required.";
    console.error(`[Email Service Error] ${errorMsg}`);
    return { success: false, messageId: null, error: errorMsg };
  }

  const senderEmail = config.SMTP_EMAIL;
  const from = `"AgentraZira" <${senderEmail}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(text && { text }),
    });
    return {
      success: true,
      messageId: info.messageId || null,
      error: null,
    };
  } catch (error) {
    // Mask sensitive details (passwords, tokens, keys) in error logging
    const maskedMessage = (error.message || "").replace(
      /(password|pass|secret|key)=\S+/gi,
      "$1=***",
    );
    console.error(
      `[Email Service Error] Delivery failed to ${to}: ${maskedMessage}`,
    );
    return {
      success: false,
      messageId: null,
      error: maskedMessage,
    };
  }
};

export default {
  transporter,
  verifyTransporter,
  verifyEmailConnection,
  sendEmail,
};
