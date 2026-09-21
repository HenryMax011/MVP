import { NextResponse } from "next/server";
import { exportTransactionsCsv } from "@/actions/settings";

export async function GET() {
  const csv = await exportTransactionsCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="extrato-financias.csv"',
    },
  });
}
