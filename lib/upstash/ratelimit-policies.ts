export type RatelimitWindow =
  | `${number} ms`
  | `${number} s`
  | `${number} m`
  | `${number} h`
  | `${number} d`;

export interface RatelimitMessageContext {
  retryAfter: string;
  attempts: number;
  window: RatelimitWindow;
}

export interface RatelimitPolicy {
  attempts: number;
  window: RatelimitWindow;
  keyPrefix: string;
  message?: string | ((ctx: RatelimitMessageContext) => string);
}

export const RATELIMIT_POLICIES = {
  // Passcode verification on client delivery review rooms
  deliveryPasscode: {
    attempts: 10,
    window: "15 m",
    keyPrefix: "rl:delivery:passcode",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many passcode attempts. Please try again in ${retryAfter}.`,
  },

  // Authentication: Sign-in / Log-in
  authLogin: {
    attempts: 5,
    window: "15 m",
    keyPrefix: "rl:auth:login",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many login attempts. Please try again in ${retryAfter}.`,
  },

  // Authentication: Sign-up
  authSignup: {
    attempts: 5,
    window: "15 m",
    keyPrefix: "rl:auth:signup",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many signup attempts. Please try again in ${retryAfter}.`,
  },

  // Password reset request
  passwordReset: {
    attempts: 3,
    window: "15 m",
    keyPrefix: "rl:auth:password-reset",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many password reset requests. Please try again in ${retryAfter}.`,
  },

  // Waitlist submissions
  waitlistJoin: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:waitlist:join",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many waitlist submissions. Please try again in ${retryAfter}.`,
  },

  // Client feedback submissions on delivery review cuts
  feedbackAdd: {
    attempts: 20,
    window: "1 h",
    keyPrefix: "rl:delivery:feedback",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many comments submitted. Please try again in ${retryAfter}.`,
  },

  // Presigned file upload request
  presignedUpload: {
    attempts: 20,
    window: "10 m",
    keyPrefix: "rl:upload:presign",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Upload rate limit reached. Please wait ${retryAfter} before uploading more files.`,
  },

  // Direct media streaming / downloads
  mediaAccess: {
    attempts: 60,
    window: "1 m",
    keyPrefix: "rl:media:access",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Media request rate limit exceeded. Please try again in ${retryAfter}.`,
  },
} as const satisfies Record<string, RatelimitPolicy>;
