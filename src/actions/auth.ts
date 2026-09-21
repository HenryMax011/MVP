"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { seedUserDefaults } from "@/lib/defaults";
import { sendResetCodeEmail, sendVerificationEmail } from "@/lib/mail";
import { createResetCode, createVerifyToken, hashToken } from "@/lib/tokens";
import {
  FLASH_COOKIE,
  NEXT_PATH_COOKIE,
  RESET_EMAIL_COOKIE,
  RESET_TICKET_COOKIE,
  SIGNUP_EMAIL_COOKIE,
} from "@/lib/auth-cookies";

export type AuthState = { error?: string; sent?: boolean } | null;

const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido");
const passwordSchema = z.string().min(6, "A senha precisa ter ao menos 6 caracteres");

async function setSignupEmail(email: string) {
  const store = await cookies();
  store.set(SIGNUP_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
}

async function getSignupEmail() {
  const store = await cookies();
  return store.get(SIGNUP_EMAIL_COOKIE)?.value ?? null;
}

async function setResetEmail(email: string) {
  const store = await cookies();
  store.set(RESET_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
}

async function getResetEmail() {
  const store = await cookies();
  return store.get(RESET_EMAIL_COOKIE)?.value ?? null;
}

async function clearResetCookies() {
  const store = await cookies();
  store.delete(RESET_EMAIL_COOKIE);
  store.delete(RESET_TICKET_COOKIE);
}

async function setFlash(message: string) {
  const store = await cookies();
  store.set(FLASH_COOKIE, message, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 5,
  });
}

async function issueVerifyToken(userId: string, email: string, name: string) {
  const token = createVerifyToken();
  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyTokenHash: hashToken(token),
      verifyTokenExp: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  await sendVerificationEmail(email, name, token);
}

export async function startSignupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Informe um e-mail válido" };
  }
  const email = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerifiedAt) {
    return { error: "Já existe uma conta com esse e-mail. Entre para continuar." };
  }

  await setSignupEmail(email);
  redirect("/cadastro/dados");
}

export async function completeSignupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = await getSignupEmail();
  if (!email) {
    redirect("/cadastro");
  }

  const name = String(formData.get("name") ?? "").trim();
  const passwordParsed = passwordSchema.safeParse(formData.get("password"));
  if (name.length < 2) return { error: "Informe seu nome" };
  if (!passwordParsed.success) {
    return { error: passwordParsed.error.issues[0]?.message ?? "Senha inválida" };
  }
  if (String(formData.get("confirmPassword") ?? "") !== passwordParsed.data) {
    return { error: "As senhas não coincidem" };
  }

  try {
    const passwordHash = await bcrypt.hash(passwordParsed.data, 12);
    const existing = await prisma.user.findUnique({ where: { email } });

    let userId: string;
    if (existing) {
      if (existing.emailVerifiedAt) {
        return { error: "Já existe uma conta com esse e-mail." };
      }
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash },
      });
      userId = user.id;
    } else {
      const user = await prisma.user.create({
        data: { name, email, passwordHash },
      });
      await seedUserDefaults(user.id);
      userId = user.id;
    }

    await issueVerifyToken(userId, email, name);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SMTP") || message.includes("e-mail")) {
      return { error: message };
    }
    return { error: "Não foi possível criar a conta. Tente de novo em instantes." };
  }

  redirect("/cadastro/verifique");
}

export async function resendVerificationAction(
  _prev: AuthState,
  _formData: FormData,
): Promise<AuthState> {
  const email = await getSignupEmail();
  if (!email) return { error: "Recomece o cadastro para reenviar o e-mail." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerifiedAt) {
    return { error: "Não foi possível reenviar o e-mail." };
  }

  try {
    await issueVerifyToken(user.id, user.email, user.name);
  } catch (error) {
    console.error(error);
    return { error: "Não foi possível reenviar o e-mail agora." };
  }
  return { sent: true };
}

export async function confirmEmailAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Link inválido." };

  const user = await prisma.user.findFirst({
    where: {
      verifyTokenHash: hashToken(token),
      verifyTokenExp: { gt: new Date() },
    },
  });

  if (!user) {
    return { error: "Este link é inválido ou já expirou. Solicite um novo e-mail." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      verifyTokenHash: null,
      verifyTokenExp: null,
    },
  });

  const store = await cookies();
  store.delete(SIGNUP_EMAIL_COOKIE);
  await setFlash("E-mail confirmado. Entre na sua conta.");
  redirect("/login");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const emailParsed = emailSchema.safeParse(formData.get("email"));
  const passwordParsed = passwordSchema.safeParse(formData.get("password"));
  if (!emailParsed.success || !passwordParsed.success) {
    return { error: "E-mail ou senha inválidos" };
  }

  const user = await prisma.user.findUnique({ where: { email: emailParsed.data } });
  if (!user) return { error: "E-mail ou senha inválidos" };

  const ok = await bcrypt.compare(passwordParsed.data, user.passwordHash);
  if (!ok) return { error: "E-mail ou senha inválidos" };

  if (!user.emailVerifiedAt) {
    await setSignupEmail(user.email);
    try {
      await issueVerifyToken(user.id, user.email, user.name);
    } catch (error) {
      console.error(error);
    }
    return { error: "Confirme seu e-mail para entrar. Enviamos um novo link." };
  }

  await setSessionCookie({ userId: user.id, email: user.email, name: user.name });

  const store = await cookies();
  const next = store.get(NEXT_PATH_COOKIE)?.value;
  store.delete(NEXT_PATH_COOKIE);
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(dest);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function requestResetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Informe um e-mail válido" };
  }
  const email = parsed.data;
  await setResetEmail(email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    try {
      const code = createResetCode();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCodeHash: hashToken(code),
          resetCodeExp: new Date(Date.now() + 1000 * 60 * 15),
          resetAttempts: 0,
          resetTicketHash: null,
        },
      });
      await sendResetCodeEmail(user.email, user.name, code);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("SMTP") || message.includes("e-mail")) {
        return { error: message };
      }
      return { error: "Não foi possível enviar o código agora." };
    }
  }

  redirect("/recuperar/codigo");
}

export async function resendResetCodeAction(
  _prev: AuthState,
  _formData: FormData,
): Promise<AuthState> {
  const email = await getResetEmail();
  if (!email) return { error: "Informe o e-mail novamente." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    try {
      const code = createResetCode();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCodeHash: hashToken(code),
          resetCodeExp: new Date(Date.now() + 1000 * 60 * 15),
          resetAttempts: 0,
          resetTicketHash: null,
        },
      });
      await sendResetCodeEmail(user.email, user.name, code);
    } catch (error) {
      console.error(error);
      return { error: "Não foi possível reenviar o código." };
    }
  }
  return { sent: true };
}

export async function verifyResetCodeAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = await getResetEmail();
  if (!email) redirect("/recuperar");

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { error: "Digite o código de 6 dígitos." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.resetCodeHash || !user.resetCodeExp || user.resetCodeExp < new Date()) {
    return { error: "Código inválido ou expirado. Solicite outro." };
  }
  if (user.resetAttempts >= 5) {
    return { error: "Muitas tentativas. Peça um código novo." };
  }

  if (user.resetCodeHash !== hashToken(code)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { resetAttempts: { increment: 1 } },
    });
    return { error: "Código incorreto." };
  }

  const ticket = createVerifyToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetCodeHash: null,
      resetCodeExp: null,
      resetAttempts: 0,
      resetTicketHash: hashToken(ticket),
    },
  });

  const store = await cookies();
  store.set(RESET_TICKET_COOKIE, ticket, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  });
  redirect("/recuperar/senha");
}

export async function completeResetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = await getResetEmail();
  const store = await cookies();
  const ticket = store.get(RESET_TICKET_COOKIE)?.value;
  if (!email || !ticket) redirect("/recuperar");

  const passwordParsed = passwordSchema.safeParse(formData.get("password"));
  if (!passwordParsed.success) {
    return { error: passwordParsed.error.issues[0]?.message ?? "Senha inválida" };
  }
  if (String(formData.get("confirmPassword") ?? "") !== passwordParsed.data) {
    return { error: "As senhas não coincidem" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.resetTicketHash !== hashToken(ticket)) {
    await clearResetCookies();
    return { error: "Sessão de recuperação expirada. Comece de novo." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(passwordParsed.data, 12),
      resetTicketHash: null,
      resetCodeHash: null,
      resetCodeExp: null,
      resetAttempts: 0,
    },
  });
  await clearResetCookies();
  await setFlash("Senha atualizada. Entre com a nova senha.");
  redirect("/login");
}
