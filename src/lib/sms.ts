/**
 * Send an emergency SMS by opening the device's native messaging app.
 * Uses the `sms:` URL scheme — no external APIs, no API keys required.
 * The message is pre-filled; the user must tap Send in their messaging app.
 */

export function sendEmergencySMS(
  phone: string,
  userName: string,
  location?: { latitude: number; longitude: number },
): boolean {
  let message = `🚨 EMERGENCY ALERT\n\n${userName} may need help. Please contact them immediately.`;

  if (location) {
    const mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    message += `\n\nCurrent location:\n${mapsLink}`;
  }

  try {
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
    return true;
  } catch {
    // sms: scheme not supported on this browser/platform
    return false;
  }
}

/**
 * Request the user's current geolocation.
 * Returns coordinates if granted, or null if denied / unavailable.
 */
export function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  });
}

/**
 * Validate an Indian phone number.
 * Accepts: 10-digit, +91 prefix, 91 prefix, with or without spaces/dashes.
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // +91XXXXXXXXXX or 91XXXXXXXXXX or XXXXXXXXXX
  return /^(\+?91)?[6-9]\d{9}$/.test(cleaned);
}

/**
 * Format a phone number to international format for the sms: URL.
 */
export function formatPhoneForSMS(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return cleaned;
}
