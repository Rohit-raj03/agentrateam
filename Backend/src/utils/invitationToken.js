import crypto from "node:crypto";

/**
 * Hash a raw invitation token with SHA-256
 * @param {string} rawToken
 * @returns {string} Hex-encoded SHA-256 hash
 */
export const hashInvitationToken = (rawToken) => {
  if (!rawToken || typeof rawToken !== "string") {
    return "";
  }
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/**
 * Generate a cryptographically secure random invitation token
 * and its SHA-256 hash for secure database storage.
 * @returns {{ rawToken: string, tokenHash: string }}
 */
export const generateInvitationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);
  return { rawToken, tokenHash };
};

export default {
  generateInvitationToken,
  hashInvitationToken,
};
