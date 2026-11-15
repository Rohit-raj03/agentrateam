/**
 * Escapes characters with special meaning in regular expressions.
 * Prevents ReDoS and syntax errors from unexpected metacharacters in user input.
 * @param {string} string - Raw user input string
 * @returns {string} Escaped string safe for RegExp or MongoDB $regex
 */
export const escapeRegex = (string = "") => {
  if (typeof string !== "string") return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export default escapeRegex;
