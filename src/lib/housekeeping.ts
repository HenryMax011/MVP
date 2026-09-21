import { prisma } from "@/lib/db";
import { formatBRL, formatDate } from "@/lib/format";
import { sendBillReminderEmail } from "@/lib/mail";
import { ensureRecurring } from "@/lib/recurring";

export async function runHousekeeping(userId: string) {
  try {
    await ensureRecurring(userId);
  } catch (error) {
    console.error(error);
  }
  try {
    await notifyDueBills(userId);
  } catch (error) {
    console.error(error);
  }
}

async function notifyDueBills(userId: string) {
  if (!process.env.RESEND_API_KEY && !process.env.SMTP_USER) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return;

  const limit = new Date();
  limit.setDate(limit.getDate() + 3);
  const bills = await prisma.bill.findMany({
    where: {
      userId,
      status: "pending",
      dueDate: { lte: limit },
      remindedAt: null,
    },
    orderBy: { dueDate: "asc" },
  });
  if (bills.length === 0) return;

  await sendBillReminderEmail(
    user.email,
    user.name,
    bills.map((b) => ({
      name: b.name,
      amountLabel: formatBRL(b.amount),
      dueLabel: formatDate(b.dueDate),
    })),
  );
  await prisma.bill.updateMany({
    where: { id: { in: bills.map((b) => b.id) } },
    data: { remindedAt: new Date() },
  });
}
