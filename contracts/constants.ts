export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
  googleOauthStart: "/api/auth/google/start",
  googleOauthCallback: "/api/auth/google/callback",
  driveOauthCallback: "/api/admin/drive/callback",
} as const;
