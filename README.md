# Financias

Sistema web de controle financeiro pessoal e compartilhado: saldo, lançamentos, contas, cartões, dívidas, grupos e assistente.

## Como rodar

```bash
npm install
npx prisma generate
npm run db:push
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e crie sua conta em **Criar conta**.

## Assistente de IA

O assistente em `/ia` usa só o **Gemini** (`GEMINI_API_KEY` do Google AI Studio). O modelo padrão é `gemini-2.5-flash`; troque com `GEMINI_MODEL`. A mesma chave vale no PC e na Vercel.

## Banco (Supabase)

O Prisma usa o pooler de transação (`DATABASE_URL`, porta 6543) no app e o pooler de sessão (`DIRECT_URL`, porta 5432) em `prisma db push` / migrate.
