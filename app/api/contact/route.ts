import { NextResponse } from "next/server";
import { z } from "zod";
import { CONTACT_INBOX, getResend, RESEND_FROM } from "@/lib/resend";
import { createServiceRoleClient } from "@/lib/supabase";

const InquirySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  message: z.string().min(1).max(5000),
  // Honeypot. Deliberately NOT constrained to empty here — validating it
  // would make a filled one a 400, which is a signal to whoever wrote the
  // bot. It's checked after parsing so a hit can return a quiet 200 instead.
  company: z.string().max(200).optional().default(""),
});

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = InquirySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill in your name, a valid email, and a message." },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Honeypot filled → tell the caller it worked. Telling a bot it was caught
  // only teaches whoever wrote it to stop filling the field.
  //
  // But quietly discarding the message is the wrong failure mode: browsers do
  // sometimes autofill a field named like this despite autocomplete="off", and
  // a real booking inquiry that vanishes while showing "Thanks!" is far more
  // costly than a spam row. So it still gets written, just flagged.
  if (data.company) {
    try {
      await createServiceRoleClient()
        .from("inquiries")
        .insert({
          name: data.name,
          email: data.email,
          message: data.message,
          source: "contact_form_honeypot",
          status: "spam",
        });
    } catch (err) {
      console.error("Honeypot inquiry persist threw:", err);
    }
    return NextResponse.json({ ok: true });
  }

  // Persist first. The row, not the email, is what makes an inquiry durable —
  // if Resend is down or the domain lapses, the message still isn't lost.
  let persisted = false;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("inquiries").insert({
      name: data.name,
      email: data.email,
      message: data.message,
      source: "contact_form",
    });
    // supabase-js reports failures on the returned object rather than
    // throwing, so the catch below never sees a rejected insert. Checking
    // `error` is the only way to know this actually landed.
    if (error) {
      console.error("Inquiry persist failed:", error.message);
    } else {
      persisted = true;
    }
  } catch (err) {
    console.error("Inquiry persist threw:", err);
  }

  let emailed = false;
  try {
    const html = `
      <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1c1622;max-width:560px">
        <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#c48b36;margin:0">New inquiry</p>
        <h2 style="font-size:22px;margin:6px 0 24px">${escape(data.name)}</h2>
        <table style="border-collapse:collapse;font-size:14px;line-height:1.6">
          <tr>
            <td style="padding:4px 12px 4px 0;color:#6f6676">Email</td>
            <td><a href="mailto:${escape(data.email)}">${escape(data.email)}</a></td>
          </tr>
        </table>
        <p style="margin:24px 0 6px;color:#6f6676;font-size:13px">Message</p>
        <div style="white-space:pre-wrap;font-size:15px;line-height:1.7;padding:14px 16px;background:#f6f3f8;border-radius:10px">${escape(
          data.message
        )}</div>
      </div>
    `;

    const { error } = await getResend().emails.send({
      from: `Depth & Dawn Audio <${RESEND_FROM}>`,
      to: [CONTACT_INBOX],
      replyTo: data.email,
      subject: `New inquiry from ${data.name}`,
      html,
    });
    if (error) {
      console.error("Inquiry email failed:", error);
    } else {
      emailed = true;
    }
  } catch (err) {
    console.error("Inquiry email threw:", err);
  }

  // As long as one of the two channels worked, the message reached her.
  if (!persisted && !emailed) {
    return NextResponse.json(
      {
        error:
          "Your message couldn't be delivered. Please email stephaniebetschart1@gmail.com directly.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
