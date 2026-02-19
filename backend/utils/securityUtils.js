function maskEmail(email) {
  if (!email || typeof email !== "string") {
    return null;
  }

  const normalized = email.trim();
  const atIndex = normalized.indexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return null;
  }

  const localPart = normalized.slice(0, atIndex);
  const domainPart = normalized.slice(atIndex + 1);

  return `${localPart.charAt(0)}***@${domainPart}`;
}

function maskIP(ip) {
  if (!ip || typeof ip !== "string") {
    return null;
  }

  const normalized = ip.trim();

  if (normalized.includes(".")) {
    const parts = normalized.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }

  if (normalized.includes(":")) {
    const segments = normalized.split(":").filter(Boolean);
    if (segments.length >= 2) {
      return `${segments.slice(0, 2).join(":")}:****:****`;
    }
  }

  return "***";
}

function sanitizeUserForResponse(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const blockedKeyPattern = /(password|secret|token|reset_token|api_key|private_key)/i;

  return Object.entries(user).reduce((safeUser, [key, value]) => {
    if (blockedKeyPattern.test(key)) {
      return safeUser;
    }

    safeUser[key] = value;
    return safeUser;
  }, {});
}

module.exports = {
  maskEmail,
  maskIP,
  sanitizeUserForResponse,
};
