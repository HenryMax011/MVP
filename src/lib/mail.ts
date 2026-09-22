import { Resend } from "resend";
import nodemailer from "nodemailer";
import { mailAppUrl } from "@/lib/app-url";

const RESEND_FROM = "MVP Finanças <onboarding@resend.dev>";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function fromAddress(smtpUser: string) {
  const raw = process.env.MAIL_FROM?.trim() || "";
  const match = raw.match(/<([^>]+)>/);
  const configured = (match?.[1] || raw).trim();
  if (configured && configured.toLowerCase() === smtpUser.toLowerCase()) {
    return { name: "MVP Finanças", address: smtpUser };
  }
  return { name: "MVP Finanças", address: smtpUser };
}

async function sendWithResend(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  const resend = new Resend(apiKey);
  const from = process.env.MAIL_FROM?.includes("@resend.dev")
    ? process.env.MAIL_FROM.trim()
    : RESEND_FROM;
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }
  return true;
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (await sendWithResend(to, subject, html, text)) return;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s/g, "");
  if (!user || !pass) {
    throw new Error("Configure SMTP_USER e SMTP_PASS (senha de app do Gmail) no .env para enviar e-mails.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: fromAddress(user),
      replyTo: user,
      to,
      subject,
      html,
      text,
      headers: {
        "X-Entity-Ref-ID": `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro desconhecido";
    throw new Error(`Falha ao enviar e-mail: ${detail}`);
  }
}

function layout(title: string, body: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f3;margin:0;padding:0">
    <tr>
      <td align="center" style="padding:28px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8e0">
          <tr>
            <td style="padding:22px 24px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#14201b">
              MVP Finanças
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;color:#14201b;padding:8px 24px 28px">
              <h1 style="font-size:20px;line-height:1.35;margin:0 0 12px;font-weight:700">${title}</h1>
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const verifyUrl = `${await mailAppUrl()}/verificar?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);
  const html = layout(
    `Olá, ${safeName}`,
    `<p style="line-height:1.55;color:#3d4a44;margin:0 0 16px">Você criou uma conta no MVP Finanças. Para entrar, abra este link no seu navegador:</p>
    <p style="margin:0 0 18px">
      <a href="${verifyUrl}" style="background:#0c8a5d;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:600">Abrir o MVP Finanças</a>
    </p>
    <p style="font-size:13px;line-height:1.5;color:#5b6b63;margin:0 0 8px;word-break:break-all">${verifyUrl}</p>
    <p style="font-size:13px;line-height:1.5;color:#5b6b63;margin:0">O link vale por 24 horas. Se você não pediu isso, pode ignorar.</p>`,
  );
  await sendEmail(
    to,
    "Seu link do MVP Finanças",
    html,
    `Olá, ${name}.\n\nVocê criou uma conta no MVP Finanças. Abra este link para entrar:\n${verifyUrl}\n\nO link vale por 24 horas. Se você não pediu isso, ignore este e-mail.`,
  );
  if (process.env.NODE_ENV !== "production") {
    console.info(`[mail] verificação enviada. Link: ${verifyUrl}`);
  }
}

export async function sendResetCodeEmail(to: string, name: string, code: string) {
  const digits = escapeHtml(code);
  const html = layout(
    `Olá, ${escapeHtml(name)}`,
    `<p style="line-height:1.55;color:#3d4a44;margin:0 0 16px">Seu código para criar uma senha nova no MVP Finanças é:</p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;letter-spacing:6px;color:#14201b;margin:0 0 16px">${digits}</p>
    <p style="font-size:13px;line-height:1.5;color:#5b6b63;margin:0">Vale por 15 minutos. Se você não pediu isso, ignore este e-mail.</p>`,
  );
  await sendEmail(
    to,
    "Código do MVP Finanças",
    html,
    `Olá, ${name}.\n\nSeu código para criar uma senha nova no MVP Finanças é ${code}.\nVale por 15 minutos.`,
  );
}

export async function sendBillReminderEmail(
  to: string,
  name: string,
  bills: { name: string; amountLabel: string; dueLabel: string }[],
) {
  const items = bills
    .map(
      (b) =>
        `<li style="margin:0 0 8px">${escapeHtml(b.name)} · ${escapeHtml(b.amountLabel)} · vence ${escapeHtml(b.dueLabel)}</li>`,
    )
    .join("");
  const contasUrl = `${await mailAppUrl()}/contas`;
  const html = layout(
    `Olá, ${escapeHtml(name)}`,
    `<p style="line-height:1.55;color:#3d4a44;margin:0 0 16px">Estas contas do MVP Finanças vencem em até 3 dias:</p>
    <ul style="padding-left:18px;color:#14201b;margin:0 0 18px">${items}</ul>
    <p style="margin:0">
      <a href="${contasUrl}" style="background:#0c8a5d;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:600">Abrir minhas contas</a>
    </p>`,
  );
  const text = bills.map((b) => `${b.name} · ${b.amountLabel} · vence ${b.dueLabel}`).join("\n");
  await sendEmail(
    to,
    "Contas do MVP Finanças",
    html,
    `Olá, ${name}.\n\nEstas contas vencem em até 3 dias:\n${text}\n\n${contasUrl}`,
  );
}
