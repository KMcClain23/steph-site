import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? "hello@stephaniebetschart.com";
export const CONTACT_INBOX =
  process.env.CONTACT_INBOX_EMAIL ?? "stephaniebetschart1@gmail.com";
