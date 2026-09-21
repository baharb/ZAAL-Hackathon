// Parent contact verification for AccountSetupScreen.
//
// Flow: parent types an email or phone number -> we ask Supabase Auth to
// send a 6-digit one-time code to it (signInWithOtp) -> parent types the
// code back -> we ask Supabase to check it (verifyOtp). Once verified we
// immediately sign out of Supabase again — the app doesn't keep a Supabase
// session, it only uses this as a one-time "yes, this contact is real and
// this parent can receive something sent to it" check before calling the
// existing local activateAccount(contact, pin, birthYear).
//
// IMPORTANT (Iran / SMS): Twilio — the SMS provider behind Supabase's phone
// OTP — stopped delivering SMS to Iranian numbers in March 2025 (US sanctions
// compliance). Since a lot of this app's audience has +98 numbers, phone
// codes will reliably fail for them. Email OTP is unaffected. We detect this
// up front and steer +98 numbers to email instead of letting them hit a
// confusing Twilio error after tapping "send".
import { supabase, supabaseConfigured } from './supabaseClient';

export type ContactChannel = 'email' | 'sms';

export interface DetectedContact {
  channel: ContactChannel;
  // Normalized value to send to Supabase: the email as typed (trimmed/lowercased)
  // or the phone in E.164 form (e.g. "+15551234567").
  value: string;
}

// Local part, domain, then a genuinely alphabetic TLD of 2+ characters.
// The previous pattern accepted anything after the dot, so "me@gmail.c"
// and "me@gmail.123" passed and the verification mail vanished.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
// Require an explicit country code (leading + or 00) — guessing a default
// country code for a Farsi-language app with a global diaspora audience
// would silently send codes to the wrong country.
const E164_RE = /^\+[1-9]\d{7,14}$/;

export function detectContact(raw: string): DetectedContact | null {
  const trimmed = raw.trim();
  if (EMAIL_RE.test(trimmed)) {
    return { channel: 'email', value: trimmed.toLowerCase() };
  }
  const digits = trimmed.replace(/[\s()-]/g, '');
  const e164 = digits.startsWith('00') ? `+${digits.slice(2)}` : digits;
  if (E164_RE.test(e164)) {
    return { channel: 'sms', value: e164 };
  }
  return null;
}

export function isIranianPhone(e164: string): boolean {
  return e164.startsWith('+98');
}

export class SendCodeError extends Error {}
export class VerifyCodeError extends Error {}

export async function sendVerificationCode(contact: DetectedContact): Promise<void> {
  if (!supabaseConfigured) {
    throw new SendCodeError('SUPABASE_NOT_CONFIGURED');
  }
  const { error } =
    contact.channel === 'email'
      ? await supabase.auth.signInWithOtp({ email: contact.value })
      : await supabase.auth.signInWithOtp({ phone: contact.value });
  if (error) throw new SendCodeError(error.message);
}

export async function verifyCode(contact: DetectedContact, code: string): Promise<void> {
  if (!supabaseConfigured) {
    throw new VerifyCodeError('SUPABASE_NOT_CONFIGURED');
  }
  const { error } =
    contact.channel === 'email'
      ? await supabase.auth.verifyOtp({ email: contact.value, token: code, type: 'email' })
      : await supabase.auth.verifyOtp({ phone: contact.value, token: code, type: 'sms' });
  if (error) throw new VerifyCodeError(error.message);
  // We only needed the one-time proof of ownership — don't keep a Supabase
  // session sitting around alongside the app's own local password system.
  await supabase.auth.signOut().catch(() => {});
}
