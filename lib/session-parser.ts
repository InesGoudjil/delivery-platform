import { headers } from 'next/headers';

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

export async function parseClientDeviceInfo(): Promise<DeviceInfo> {
  const headerList = await headers();

  const ipAddress =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    '127.0.0.1';

  const rawCity =
    headerList.get('x-vercel-ip-city') ||
    headerList.get('cf-ipcity') ||
    undefined;

  const rawCountry =
    headerList.get('x-vercel-ip-country') ||
    headerList.get('cf-ipcountry') ||
    undefined;

  let city = rawCity ? decodeURIComponent(rawCity) : undefined;
  // Fallback for localhost / private range
  if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
    if (!city) city = 'Local Development';
  }

  const ua = headerList.get('user-agent') || '';
  const { browser, os, deviceType } = parseUserAgentString(ua);

  return {
    browser,
    os,
    deviceType,
    ipAddress,
    city,
    country: rawCountry,
  };
}
