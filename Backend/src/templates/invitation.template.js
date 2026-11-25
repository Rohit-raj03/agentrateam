/**
 * Escape HTML special characters to prevent HTML injection attacks
 */
export const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

/**
 * Generate branded HTML invitation email template matching AgentraTeam theme
 * @param {Object} options
 * @param {string} options.name - Invitee full name
 * @param {string} [options.jobTitle] - Assigned job title
 * @param {string} [options.department] - Assigned department
 * @param {string} [options.jobProfile] - Assigned job profile
 * @param {string} options.role - System role (e.g. member, manager)
 * @param {string} options.invitationUrl - Full URL with secure token
 * @param {string} [options.companyName] - Organization name (default: AgentraTeam)
 * @param {string} [options.logoUrl] - Trusted logo image HTTPS URL
 * @param {number} [options.expiresHours] - Expiry window in hours (default: 48)
 * @returns {string} Safe HTML string
 */
export const invitationTemplate = ({
  name,
  jobTitle,
  department,
  jobProfile,
  role,
  invitationUrl,
  companyName = "AgentraTeam",
  logoUrl = "https://ik.imagekit.io/oyscf1yk1/logo's/CloudAgentaLogo.png?updatedAt=1795424167269",
  expiresHours = 48,
}) => {
  const safeName = escapeHtml(name || "Colleague");
  const safeJobTitle = escapeHtml(jobTitle || "Not specified");
  const safeDepartment = escapeHtml(department || "Not specified");
  const safeJobProfile = escapeHtml(jobProfile || "");
  const safeRole = escapeHtml(
    role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member",
  );
  const safeCompanyName = escapeHtml(companyName);
  const safeExpiry = escapeHtml(expiresHours);

  // Fail-closed URL validation (only http/https allowed)
  let safeUrl = "#";
  try {
    const parsed = new URL(invitationUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      safeUrl = escapeHtml(parsed.toString());
    }
  } catch {
    safeUrl = "#";
  }

  // Validate trusted HTTPS/HTTP logo URL
  const DEFAULT_LOGO_URL =
    "https://ik.imagekit.io/oyscf1yk1/logo's/CloudAgentaLogo.png?updatedAt=1795424167269";
  let safeLogoUrl = DEFAULT_LOGO_URL;
  if (logoUrl && logoUrl !== DEFAULT_LOGO_URL) {
    try {
      const parsedLogo = new URL(logoUrl);
      if (parsedLogo.protocol === "https:" || parsedLogo.protocol === "http:") {
        safeLogoUrl = escapeHtml(parsedLogo.toString());
      }
    } catch {
      safeLogoUrl = DEFAULT_LOGO_URL;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join ${safeCompanyName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fe; font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fe; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; border-collapse: collapse;">
          <!-- Top Brand Accent Bar (flush to top) -->
          <tr>
            <td style="padding: 0; margin: 0; height: 4px; background: linear-gradient(90deg, #4361ee 0%, #7064f6 55%, #00c2ff 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Banner with Company Logo -->
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center; border-bottom: 1px solid #f1f5f9; background: linear-gradient(180deg, #eef2ff 0%, #ffffff 100%);">
              <img src="${safeLogoUrl}" alt="${safeCompanyName} Logo" width="48" height="48" style="display: block; margin: 0 auto 14px auto; border-radius: 12px; object-fit: contain; max-width: 48px; max-height: 48px;" />
              <div>
                <span style="font-size: 17px; font-weight: 700; color: #4361ee; letter-spacing: -0.3px;">${safeCompanyName}</span>
              </div>
              <h1 style="margin: 10px 0 0 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">You're Invited to Join the Team</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">An administrator has invited you to collaborate on ${safeCompanyName}.</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 14px 0; font-size: 15px; color: #1e293b;">Hello <strong>${safeName}</strong>,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569;">
                You have been invited to join <strong>${safeCompanyName}</strong> as a team member. Here are the details of your assigned role and department:
              </p>

              <!-- Invitation Summary Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 28px; border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td style="padding: 14px 20px; font-size: 13px; color: #64748b; font-weight: 500; width: 38%; border-bottom: 1px solid #e2e8f0;">Assigned Role</td>
                  <td style="padding: 14px 20px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; background-color: #eef2ff; color: #4361ee; border: 1px solid #e0e7ff; font-size: 12px; font-weight: 700;">
                      ${safeRole}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #e2e8f0;">Job Title</td>
                  <td style="padding: 14px 20px; font-size: 13px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${safeJobTitle}</td>
                </tr>
                ${
                  safeJobProfile
                    ? `<tr>
                  <td style="padding: 14px 20px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #e2e8f0;">Job Profile</td>
                  <td style="padding: 14px 20px; font-size: 13px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${safeJobProfile}</td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 14px 20px; font-size: 13px; color: #64748b; font-weight: 500;">Department</td>
                  <td style="padding: 14px 20px; font-size: 13px; color: #0f172a; font-weight: 500;">${safeDepartment}</td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <div style="text-align: center; margin: 30px 0 24px 0;">
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #4361ee; background-image: linear-gradient(135deg, #4361ee 0%, #3451de 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 8px 20px -4px rgba(67, 97, 238, 0.35);">
                  Accept Invitation &amp; Set Password
                </a>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
                This invitation link is unique to you and will expire in <strong style="color: #475569;">${safeExpiry} hours</strong>.<br/>
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b; text-align: center; word-break: break-all;">
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4361ee; text-decoration: underline;">${safeUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 22px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                If you were not expecting this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">
                &copy; ${new Date().getFullYear()} ${safeCompanyName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export default invitationTemplate;
