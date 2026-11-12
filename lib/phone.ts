/**
 * Phone numbers for WhatsApp, stored and sent in international format as digits only
 * ("971501234567"). Accepts what people type: "+971 50 123 4567", "00971 50 123 4567",
 * "050 123 4567" or "50 123 4567" (local numbers get the default country code, UAE).
 */

export const DEFAULT_COUNTRY_CODE = "971";
const LOCAL_MIN_DIGITS = 8;
const LOCAL_MAX_DIGITS = 9;

export function normalizePhone(
  input: string | null | undefined,
  defaultCountryCode: string = DEFAULT_COUNTRY_CODE
): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value || value.length > 32) return null;
  // Digits and the usual separators, with at most one leading "+".
  if (!/^\+?[\d\s\-().]+$/.test(value)) return null;

  let digits = value.replace(/\D/g, "");
  if (!value.startsWith("+")) {
    if (digits.startsWith("00")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0") || (!digits.startsWith(defaultCountryCode) && digits.length <= 9)) {
      // A local number (UAE: 8 digits for landlines, 9 for mobiles, after the leading 0).
      const local = digits.replace(/^0/, "");
      if (local.length < LOCAL_MIN_DIGITS || local.length > LOCAL_MAX_DIGITS) return null;
      digits = defaultCountryCode + local;
    }
  }

  if (digits.startsWith("0") || digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** "+971501234567" */
export function formatPhone(digits: string): string {
  return `+${digits}`;
}

/** "+971 ••• ••4567": enough to recognise a number without showing it. */
export function maskPhone(digits: string | null | undefined): string {
  if (!digits) return "";
  const tail = digits.slice(-4);
  const country = digits.startsWith(DEFAULT_COUNTRY_CODE) ? DEFAULT_COUNTRY_CODE : digits.slice(0, Math.min(3, digits.length - 4));
  return `+${country} ••• ••${tail}`;
}
