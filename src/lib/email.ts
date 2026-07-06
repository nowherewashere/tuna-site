import "server-only";
import { env } from "./env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email abstraction. Beta: a dev transport that logs the message when no provider
 * key is set, so magic-link works locally without email infra. Wire a real provider
 * (Resend / Postmark / SES) in the branch below, gated by EMAIL_PROVIDER_KEY.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const e = env();
  if (!e.EMAIL_PROVIDER_KEY) {
    console.log(
      `[email:dev] to=${msg.to} · subject="${msg.subject}"\n${msg.text ?? msg.html}`,
    );
    return;
  }
  // TODO: real transactional provider. Kept behind the env key so beta runs without it.
  console.log(`[email] (provider configured) to=${msg.to} subject="${msg.subject}"`);
}
