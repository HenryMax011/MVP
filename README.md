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

Sem `ANTHROPIC_API_KEY`, o chat usa um analisador local sobre os seus dados. Com a chave no `.env`, passa a usar o Claude com function calling.

## Banco (Supabase)

O Prisma usa o pooler de transação (`DATABASE_URL`, porta 6543) no app e o pooler de sessão (`DIRECT_URL`, porta 5432) em `prisma db push` / migrate.
