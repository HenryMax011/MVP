import nodemailer from "nodemailer";
import { appUrl } from "@/lib/app-url";

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Financias <noreply@resend.dev>",
        to,
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Falha ao enviar e-mail: ${body}`);
    }
    return;
  }

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s/g, "");
  if (!user || !pass) {
    throw new Error("Configure SMTP_USER e SMTP_PASS (senha de app do Gmail) no .env para enviar e-mails.");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM?.trim() || `Financias <${user}>`,
    to,
    subject,
    html,
    text,
  });
}

function layout(title: string, body: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#eef6f2;margin:0;padding:0">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:440px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d7e8df">
          <tr>
            <td style="background:#0c8a5d;padding:18px 24px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">
                    Financias
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:#b8f3d4;color:#065f46;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.4px;padding:5px 10px;border-radius:999px">MVP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;color:#14201b;padding:28px 24px 32px">
              <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">${title}</h1>
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const verifyUrl = `${await appUrl()}/verificar?token=${encodeURIComponent(token)}`;
  const html = layout(
    "Confirme seu e-mail",
    `<p style="line-height:1.5;color:#5b6b63">Olá, ${name}. Para ativar sua conta, confirme que este e-mail é seu.</p>
    <p style="margin:28px 0">
      <a href="${verifyUrl}" style="background:#0c8a5d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;display:inline-block;font-weight:600">Verificar minha conta</a>
    </p>
    <p style="font-size:13px;color:#5b6b63;line-height:1.5">O link vale por 24 horas. Se você não criou esta conta, ignore esta mensagem.</p>`,
  );
  await sendEmail(to, "Confirme sua conta no Financias", html, `Olá, ${name}. Confirme sua conta: ${verifyUrl}`);
}

export async function sendResetCodeEmail(to: string, name: string, code: string) {
  const digits = code.split("").join("&nbsp;&nbsp;");
  const html = layout(
    "Código para redefinir a senha",
    `<p style="line-height:1.55;color:#5b6b63;margin:0 0 20px">Olá, ${name}. Use este código no Financias para criar uma senha nova:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="background:#f3fbf7;border:1px solid #cdeadc;border-radius:16px;padding:18px 12px 22px">
          <div style="display:inline-block;background:#0c8a5d;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.6px;padding:4px 10px;border-radius:999px;margin:0 0 12px">MVP</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:800;letter-spacing:6px;color:#065f46;line-height:1">${digits}</div>
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#5b6b63;line-height:1.5;margin:20px 0 0">O código vale por 15 minutos. Se você não pediu isso, ignore o e-mail.</p>`,
  );
  await sendEmail(to, "Seu código de recuperação — Financias", html, `Seu código Financias é ${code}. Vale por 15 minutos.`);
}

export async function sendBillReminderEmail(
  to: string,
  name: string,
  bills: { name: string; amountLabel: string; dueLabel: string }[],
) {
  const items = bills
    .map(
      (b) =>
        `<li style="margin:0 0 8px"><strong>${b.name}</strong> · ${b.amountLabel} · vence ${b.dueLabel}</li>`,
    )
    .join("");
  const html = layout(
    "Contas perto do vencimento",
    `<p style="line-height:1.5;color:#5b6b63">Olá, ${name}. Estas contas vencem em até 3 dias:</p>
    <ul style="padding-left:18px;color:#14201b">${items}</ul>
    <p style="margin:28px 0">
      <a href="${await appUrl()}/contas" style="background:#0c8a5d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;display:inline-block;font-weight:600">Abrir contas</a>
    </p>`,
  );
  const text = bills.map((b) => `${b.name} · ${b.amountLabel} · vence ${b.dueLabel}`).join("\n");
  await sendEmail(to, "Contas perto do vencimento — Financias", html, `Olá, ${name}.\n\n${text}`);
}
