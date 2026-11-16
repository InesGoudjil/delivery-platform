/**
 * The Authorization header value for a Zoho CPaaS (formerly ZeptoMail) API key, for email and
 * WhatsApp alike. The console shows each key with its scheme ("Zoho-enczapikey <key>"); a key
 * pasted that way (or with an older Zoho scheme) is sent as is, and a bare key gets that scheme.
 */
export function zohoAuthorization(token: string): string {
  const value = token.trim();
  return /^Zoho-enc\w+\s+\S/i.test(value) ? value : `Zoho-enczapikey ${value}`;
}
