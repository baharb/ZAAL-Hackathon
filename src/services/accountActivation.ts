// Parent contact verification for AccountSetupScreen.
//
// Flow: parent types an email or phone number -> we ask Supabase Auth to
// send a 6-digit one-time code to it (signInWithOtp) -> parent types the
// code back -> we ask Supabase to check it (verifyOtp). That's the "yes,
// this contact is real" check before the local activateAccount(contact, pin,
// birthYear). The resulting session is kept only so the account can later be
// deleted from Settings (see the deletion section at the bottom).
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
  // The session is deliberately KEPT (it used to be signed out here). It is
  // what lets "Delete account" in Settings remove the Supabase user without
  // a second emailed code — App Store guideline 5.1.1(v) requires in-app
  // account deletion. Nothing else in the app reads it.
}

// ---- Account deletion (App Store guideline 5.1.1(v)) ----------------------
//
// The only server-side record is the Supabase auth user that signInWithOtp
// created. `delete_my_account()` is a SECURITY DEFINER SQL function (see
// supabase/delete_my_account.sql — it must be installed in the project) that
// deletes auth.users where id = auth.uid(), so it needs a live session:
//   - installs that verified on this build still hold the session above;
//   - older installs signed out right after verifying, so they re-prove
//     ownership with a fresh code (sendDeletionCode + verifyCode) first.

export class DeleteAccountError extends Error {
  constructor(message: string, readonly needsReverify = false) { super(message); }
}

export async function hasRemoteSession(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}

export async function deleteRemoteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    const authProblem = /jwt|auth|not authenticated|401/i.test(`${error.code} ${error.message}`);
    throw new DeleteAccountError(error.message, authProblem);
  }
  // The user row is gone, so a global sign-out would 4xx; just drop the
  // local copy of the session.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

// Re-verification for deletion. shouldCreateUser: false so this can't create
// the very record we're about to delete. Returns 'no-remote-account' when
// Supabase has no user for this contact — then there's nothing server-side
// to delete and wiping local data completes the deletion.
export async function sendDeletionCode(contact: DetectedContact): Promise<'sent' | 'no-remote-account'> {
  if (!supabaseConfigured) return 'no-remote-account';
  const options = { shouldCreateUser: false };
  const { error } =
    contact.channel === 'email'
      ? await supabase.auth.signInWithOtp({ email: contact.value, options })
      : await supabase.auth.signInWithOtp({ phone: contact.value, options });
  if (!error) return 'sent';
  if ((error as any).code === 'otp_disabled' || /signups not allowed/i.test(error.message)) {
    return 'no-remote-account';
  }
  throw new SendCodeError(error.message);
}
