import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type ContactPayload = {
  name?: string;
  email?: string;
  organization?: string;
  message?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Inquiries go straight to Athos's inbox (CONTACT_TO, keyah@athosed.com) through one of Athos's own Google Workspace
// accounts, using an app password. Until those are set, they go to the older n8n webhook.
const smtpUser = process.env.CONTACT_SMTP_USER;
const smtpPass = process.env.CONTACT_SMTP_PASS;
const sendTo = process.env.CONTACT_TO || "keyah@athosed.com";

async function sendEmail(p: Required<ContactPayload>) {
  const mail = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: smtpUser, pass: smtpPass } });
  await mail.sendMail({
    from: { name: "athosed.com", address: smtpUser! },
    to: sendTo,
    replyTo: { name: p.name, address: p.email },
    subject: `Website inquiry from ${p.name}${p.organization ? `, ${p.organization}` : ""}`,
    text: [`Name: ${p.name}`, `Email: ${p.email}`, `Organization: ${p.organization || "(not given)"}`, "", p.message, "", "Sent from the contact form on athosed.com. Reply to this email to answer them."].join("\n"),
  });
}

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_CONTACT_WEBHOOK_URL;
  const apiKey = process.env.N8N_CONTACT_API_KEY;
  const viaEmail = Boolean(smtpUser && smtpPass);

  if (!viaEmail && (!webhookUrl || !apiKey)) {
    console.error("Contact form has no route: set CONTACT_SMTP_USER and CONTACT_SMTP_PASS (or the n8n webhook)");
    return NextResponse.json(
      { error: "Contact form is not configured." },
      { status: 500 },
    );
  }

  let body: ContactPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const organization = body.organization?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  if (viaEmail) {
    try {
      await sendEmail({ name, email, organization, message });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Contact email failed", error);
      return NextResponse.json({ error: "Unable to send your message right now." }, { status: 502 });
    }
  }

  const payload = {
    name,
    email,
    organization,
    message,
    submittedAt: new Date().toISOString(),
    source: "athosed.com/contact",
  };

  try {
    const upstream = await fetch(webhookUrl!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey!,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("n8n webhook failed", {
        status: upstream.status,
        urlHost: (() => {
          try {
            return new URL(webhookUrl!).host;
          } catch {
            return "invalid-url";
          }
        })(),
        urlPath: (() => {
          try {
            return new URL(webhookUrl!).pathname;
          } catch {
            return "invalid-url";
          }
        })(),
        detail: detail.slice(0, 500),
      });
      return NextResponse.json(
        {
          error: "Unable to send your message right now.",
          upstreamStatus: upstream.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("n8n webhook request error", error);
    return NextResponse.json(
      {
        error: "Unable to send your message right now.",
        upstreamStatus: 0,
      },
      { status: 502 },
    );
  }
}
