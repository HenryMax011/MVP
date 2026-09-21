import { prisma } from "@/lib/db";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";

export async function seedUserDefaults(userId: string) {
  await prisma.account.create({
    data: {
      userId,
      name: "Carteira",
      type: "cash",
      balance: 0,
      color: "#10b981",
    },
  });

  await prisma.category.createMany({
    data: [
      ...EXPENSE_CATEGORIES.map((c) => ({
        userId,
        name: c.name,
        type: "expense",
        icon: c.icon,
        color: c.color,
        isDefault: true,
      })),
      ...INCOME_CATEGORIES.map((c) => ({
        userId,
        name: c.name,
        type: "income",
        icon: c.icon,
        color: c.color,
        isDefault: true,
      })),
    ],
  });
}
