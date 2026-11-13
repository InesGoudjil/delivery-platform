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
  // Across all visitors of one room: stops distributed guessing of a single passcode.
  deliveryPasscodeRoom: {
    attempts: 50,
    window: "1 h",
    keyPrefix: "rl:delivery:passcode-room",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `This delivery is temporarily locked after too many passcode attempts. Please try again in ${retryAfter}.`,
  },

  // Client-room approvals and download alerts email the studio, so they're limited per visitor.
  deliveryApproval: {
    attempts: 30,
    window: "1 h",
    keyPrefix: "rl:delivery:approval",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many approval changes. Please try again in ${retryAfter}.`,
  },

  deliveryDownloadNotice: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:delivery:download-notice",
  },

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

  // WhatsApp: every message is paid for and goes out from CineSpace's own number.
  whatsappCodeSend: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:whatsapp:code-send",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many codes requested. Please try again in ${retryAfter}.`,
  },

  whatsappCodeCheck: {
    attempts: 15,
    window: "15 m",
    keyPrefix: "rl:whatsapp:code-check",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Too many attempts. Please try again in ${retryAfter}.`,
  },

  // Review links sent to clients on WhatsApp, per delivery and per workspace.
  whatsappClientSendDelivery: {
    attempts: 5,
    window: "1 h",
    keyPrefix: "rl:whatsapp:client-send:delivery",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `This review link was sent on WhatsApp several times already. Please try again in ${retryAfter}.`,
  },

  whatsappClientSendWorkspace: {
    attempts: 100,
    window: "1 d",
    keyPrefix: "rl:whatsapp:client-send:workspace",
    message: ({ retryAfter }: RatelimitMessageContext) =>
      `Your studio reached today's WhatsApp sending limit. Please try again in ${retryAfter}.`,
  },

  // The "second client link" email (library 14): at most one a day per workspace, however often it's tried.
  planLimitNotice: {
    attempts: 1,
    window: "1 d",
    keyPrefix: "rl:plan:limit-notice",
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
