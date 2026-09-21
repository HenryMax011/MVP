import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../src/lib/constants";

const prisma = new PrismaClient();

function at(now: Date, monthOffset: number, day: number, hour = 12) {
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, day, hour, 0, 0);
}

async function seedDefaults(userId: string) {
  await prisma.account.create({
    data: { userId, name: "Carteira", type: "cash", balance: 0, color: "#10b981" },
  });
  await prisma.category.createMany({
    data: [
      ...EXPENSE_CATEGORIES.map((c) => ({
        userId,
        name: c.name,
        type: "expense" as const,
        icon: c.icon,
        color: c.color,
        isDefault: true,
      })),
      ...INCOME_CATEGORIES.map((c) => ({
        userId,
        name: c.name,
        type: "income" as const,
        icon: c.icon,
        color: c.color,
        isDefault: true,
      })),
    ],
  });
}

async function cat(userId: string, name: string) {
  const found = await prisma.category.findFirst({ where: { userId, name } });
  return found?.id ?? null;
}

async function main() {
  const now = new Date();
  const passwordHash = await bcrypt.hash("demo1234", 12);

  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.sharedSplit.deleteMany();
  await prisma.sharedExpense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const henry = await prisma.user.create({
    data: {
      name: "Henry Costa",
      email: "demo@financias.app",
      passwordHash,
    },
  });
  const ana = await prisma.user.create({
    data: {
      name: "Ana Souza",
      email: "ana@financias.app",
      passwordHash,
    },
  });

  await seedDefaults(henry.id);
  await seedDefaults(ana.id);

  const nubank = await prisma.account.create({
    data: {
      userId: henry.id,
      name: "Nubank",
      type: "checking",
      balance: 482350,
      color: "#8b5cf6",
    },
  });

  await prisma.account.updateMany({
    where: { userId: henry.id, name: "Carteira" },
    data: { balance: 18600 },
  });
  const wallet = await prisma.account.findFirst({
    where: { userId: henry.id, name: "Carteira" },
  });

  const card = await prisma.creditCard.create({
    data: {
      userId: henry.id,
      name: "Nubank Roxinho",
      brand: "mastercard",
      creditLimit: 800000,
      closingDay: 10,
      dueDay: 17,
      color: "#820AD1",
    },
  });

  const mercado = await cat(henry.id, "Mercado");
  const alimentacao = await cat(henry.id, "Alimentação");
  const transporte = await cat(henry.id, "Transporte");
  const moradia = await cat(henry.id, "Moradia");
  const lazer = await cat(henry.id, "Lazer");
  const assinaturas = await cat(henry.id, "Assinaturas");
  const saude = await cat(henry.id, "Saúde");
  const salario = await cat(henry.id, "Salário");
  const freelance = await cat(henry.id, "Freelance");

  const txs: Parameters<typeof prisma.transaction.create>[0]["data"][] = [];

  for (const offset of [-3, -2, -1, 0]) {
    txs.push({
      userId: henry.id,
      type: "income",
      amount: 650000,
      date: at(now, offset, 5),
      description: "Salário",
      categoryId: salario,
      accountId: nubank.id,
      paymentMethod: "pix",
      status: "paid",
      isRecurring: true,
      recurrence: "monthly",
    });
  }

  txs.push(
    {
      userId: henry.id,
      type: "income",
      amount: 120000,
      date: at(now, 0, 12),
      description: "Freelance — landing page",
      categoryId: freelance,
      accountId: nubank.id,
      paymentMethod: "pix",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 187450,
      date: at(now, 0, 3),
      description: "Aluguel",
      categoryId: moradia,
      accountId: nubank.id,
      paymentMethod: "pix",
      status: "paid",
      isRecurring: true,
      recurrence: "monthly",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 54230,
      date: at(now, 0, 8),
      description: "Compras do mês — Extra",
      categoryId: mercado,
      accountId: nubank.id,
      paymentMethod: "debit",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 3280,
      date: at(now, 0, 18),
      description: "Padaria",
      categoryId: alimentacao,
      accountId: wallet?.id,
      paymentMethod: "cash",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 4590,
      date: at(now, 0, 19),
      description: "iFood — jantar",
      categoryId: alimentacao,
      cardId: card.id,
      paymentMethod: "credit",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 8900,
      date: at(now, 0, 20),
      description: "Uber",
      categoryId: transporte,
      cardId: card.id,
      paymentMethod: "credit",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 5590,
      date: at(now, 0, 7),
      description: "Spotify + ChatGPT",
      categoryId: assinaturas,
      cardId: card.id,
      paymentMethod: "credit",
      status: "paid",
      isRecurring: true,
      recurrence: "monthly",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 14990,
      date: at(now, 0, 14),
      description: "Cinema e pipoca",
      categoryId: lazer,
      cardId: card.id,
      paymentMethod: "credit",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 22000,
      date: at(now, 0, 2),
      description: "Consulta dermatologista",
      categoryId: saude,
      accountId: nubank.id,
      paymentMethod: "pix",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 67890,
      date: at(now, -1, 9),
      description: "Compras do mês",
      categoryId: mercado,
      accountId: nubank.id,
      paymentMethod: "debit",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 187450,
      date: at(now, -1, 3),
      description: "Aluguel",
      categoryId: moradia,
      accountId: nubank.id,
      paymentMethod: "pix",
      status: "paid",
      isRecurring: true,
      recurrence: "monthly",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 31200,
      date: at(now, -1, 16),
      description: "Bar com amigos",
      categoryId: lazer,
      cardId: card.id,
      paymentMethod: "credit",
      status: "paid",
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 19990,
      date: at(now, 0, 6),
      description: "Fone Bluetooth (2/3)",
      categoryId: await cat(henry.id, "Compras"),
      cardId: card.id,
      paymentMethod: "credit",
      status: "paid",
      installmentTotal: 3,
      installmentNumber: 2,
    },
    {
      userId: henry.id,
      type: "expense",
      amount: 19990,
      date: at(now, 1, 6),
      description: "Fone Bluetooth (3/3)",
      categoryId: await cat(henry.id, "Compras"),
      cardId: card.id,
      paymentMethod: "credit",
      status: "pending",
      installmentTotal: 3,
      installmentNumber: 3,
    },
  );

  for (const data of txs) {
    await prisma.transaction.create({ data });
  }

  await prisma.bill.createMany({
    data: [
      {
        userId: henry.id,
        name: "Internet fibra",
        amount: 12990,
        dueDate: at(now, 0, 25),
        categoryId: await cat(henry.id, "Contas"),
        accountId: nubank.id,
        recurrence: "monthly",
        status: "pending",
      },
      {
        userId: henry.id,
        name: "Luz",
        amount: 18640,
        dueDate: at(now, 0, 22),
        categoryId: await cat(henry.id, "Contas"),
        accountId: nubank.id,
        recurrence: "monthly",
        status: "pending",
      },
      {
        userId: henry.id,
        name: "Academia",
        amount: 9900,
        dueDate: at(now, -1, 8),
        categoryId: await cat(henry.id, "Saúde"),
        accountId: nubank.id,
        recurrence: "monthly",
        status: "paid",
        paidAt: at(now, -1, 8),
      },
    ],
  });

  await prisma.debt.create({
    data: {
      userId: henry.id,
      creditor: "Financiamento notebook",
      totalAmount: 480000,
      paidAmount: 240000,
      interestRate: 1.49,
      installments: 12,
      startDate: at(now, -6, 10),
      nextDueDate: at(now, 1, 10),
      notes: "6 de 12 parcelas pagas",
    },
  });

  const group = await prisma.group.create({
    data: {
      name: "Apartamento compartilhado",
      description: "Contas e mercado da casa",
      inviteCode: nanoid(8).toUpperCase(),
      ownerId: henry.id,
      members: {
        create: [
          { userId: henry.id, role: "admin" },
          { userId: ana.id, role: "member" },
        ],
      },
    },
  });

  const mercadoGrupo = await prisma.sharedExpense.create({
    data: {
      groupId: group.id,
      description: "Mercado da semana",
      amount: 32000,
      date: at(now, 0, 15),
      paidById: henry.id,
      splitType: "equal",
      splits: {
        create: [
          { userId: henry.id, amount: 16000 },
          { userId: ana.id, amount: 16000 },
        ],
      },
    },
  });

  await prisma.sharedExpense.create({
    data: {
      groupId: group.id,
      description: "Netflix + Prime",
      amount: 7490,
      date: at(now, 0, 4),
      paidById: ana.id,
      splitType: "equal",
      splits: {
        create: [
          { userId: henry.id, amount: 3745 },
          { userId: ana.id, amount: 3745 },
        ],
      },
    },
  });

  await prisma.sharedExpense.create({
    data: {
      groupId: group.id,
      description: "Produtos de limpeza",
      amount: 8900,
      date: at(now, 0, 11),
      paidById: henry.id,
      splitType: "equal",
      splits: {
        create: [
          { userId: henry.id, amount: 4450 },
          { userId: ana.id, amount: 4450 },
        ],
      },
    },
  });

  const mercadoTx = await prisma.transaction.create({
    data: {
      userId: henry.id,
      type: "expense",
      amount: 32000,
      date: at(now, 0, 15),
      description: "Mercado da semana (grupo)",
      categoryId: mercado,
      accountId: nubank.id,
      paymentMethod: "pix",
      status: "paid",
    },
  });
  await prisma.sharedExpense.update({
    where: { id: mercadoGrupo.id },
    data: { transactionId: mercadoTx.id },
  });

  await prisma.transaction.create({
    data: {
      userId: henry.id,
      type: "expense",
      amount: 8900,
      date: at(now, 0, 11),
      description: "Produtos de limpeza (grupo)",
      categoryId: await cat(henry.id, "Moradia"),
      accountId: nubank.id,
      paymentMethod: "pix",
      status: "paid",
    },
  });

  console.log("Seed ok");
  console.log("  demo@financias.app / demo1234");
  console.log("  ana@financias.app / demo1234");
  console.log(`  Grupo: ${group.name} · código ${group.inviteCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
