// Pure parsing (no next/headers): it's imported by the middleware, through lib/session-manager.ts.

export interface DeviceInfo {
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress: string;
  city?: string;
  country?: string;
}

export function parseUserAgentString(ua: string): {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
} {
  let browser = 'Web Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Google Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  let os = 'Desktop';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('iPad')) os = 'iPadOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'tablet';
  else if (ua.includes('Mobile') || ua.includes('iPhone') || (ua.includes('Android') && !ua.includes('Tablet'))) {
    deviceType = 'mobile';
  }

  return { browser, os, deviceType };
}
