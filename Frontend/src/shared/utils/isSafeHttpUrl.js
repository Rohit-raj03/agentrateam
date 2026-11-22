/**
 * Validates that a given string is a safe HTTP/HTTPS URL
 * Prevents Stored XSS attacks via javascript:, data:, or other harmful URI schemes.
 *
 * @param {string} url - The URL string to validate
 * @returns {boolean} True if the URL uses http: or https: protocol
 */
export const isSafeHttpUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Block dangerous schemes including javascript:, vbscript:, data:, blob:, file:
  // Strip control characters and whitespace to prevent obfuscated scheme evasion
  // eslint-disable-next-line no-control-regex
  const normalized = trimmed.replace(/[\x00-\x20\s]+/g, "").toLowerCase();
  if (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("file:")
  ) {
    return false;
  }

  try {
    const baseOrigin =
      typeof window !== "undefined" && window?.location?.origin
        ? window.location.origin
        : "https://agentrateam.io";
    const parsed = new URL(trimmed, baseOrigin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export default isSafeHttpUrl;
