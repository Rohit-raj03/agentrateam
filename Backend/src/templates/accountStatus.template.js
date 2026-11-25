/**
 * Reusable HTML email templates for account approval, revocation, deactivation, and role updates.
 */

export const accountApprovedTemplate = ({ name, loginUrl, context = "account" }) => {
  const actionText =
    context === "invitation"
      ? "An administrator has approved and accepted your invitation."
      : "An administrator has approved and activated your account.";

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Welcome to AgentraTeam, ${name}!</h2>
      <p>${actionText}</p>
      <p>Your account status is now: <strong style="color: #16a34a;">ACTIVE (Approved)</strong>.</p>
      <p>You can now log in using your registered credentials or Google Sign-In:</p>
      <div style="margin: 24px 0;">
        <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Log In to Your Account</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">If you have any questions, please reach out to your team administrator.</p>
    </div>
  `;
};

export const accountRevokedTemplate = ({ name, clientBaseUrl, context = "invitation" }) => {
  const detailText =
    context === "user_deleted"
      ? "Your account and associated invitation on <strong>AgentraTeam</strong> have been <strong>revoked</strong> and removed by an administrator."
      : "Your pending invitation to join <strong>AgentraTeam</strong> has been <strong>revoked</strong> by an administrator.";

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Hello ${name || "there"},</h2>
      <p>${detailText}</p>
      <p>If you have any questions or believe this was done in error, please contact your organization administrator.</p>
      <div style="margin: 24px 0;">
        <a href="${clientBaseUrl}" style="background-color: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Visit Workspace</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Regards,<br>AgentraTeam Administration</p>
    </div>
  `;
};

export const accountDeactivatedTemplate = ({ name, clientBaseUrl }) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
    <h2>Hello ${name},</h2>
    <p>Your account on AgentraTeam has been updated to: <strong style="color: #dc2626;">DEACTIVATED</strong> by an administrator.</p>
    <p>Your workspace access has been temporarily suspended.</p>
    <div style="margin: 24px 0;">
      <a href="${clientBaseUrl}" style="background-color: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Visit Workspace</a>
    </div>
    <p style="color: #64748b; font-size: 14px;">If you believe this was done in error or have any questions, please contact your organization administrator.</p>
  </div>
`;

export const roleUpdatedTemplate = ({ name, role, clientBaseUrl }) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
    <h2>Hello ${name},</h2>
    <p>Your account role on AgentraTeam has been updated to <strong>${role.toUpperCase()}</strong> by an administrator.</p>
    <p>Your new permissions are now active across your workspace.</p>
    <div style="margin: 24px 0;">
      <a href="${clientBaseUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Open Workspace</a>
    </div>
    <p style="color: #64748b; font-size: 14px;">If you have any questions, please contact your team administrator.</p>
  </div>
`;
