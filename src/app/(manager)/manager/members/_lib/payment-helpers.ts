import type { InvoiceRow } from "@/types/database.types";

export function invoiceIsOverdue(inv: InvoiceRow, now = new Date()): boolean {
  if (
    inv.status === "voided" ||
    inv.status === "paid" ||
    inv.status === "draft"
  ) {
    return false;
  }
  if (inv.status === "overdue") {
    return true;
  }
  if (
    inv.due_at &&
    new Date(inv.due_at) < now &&
    inv.amount_paid_cents < inv.amount_cents
  ) {
    return true;
  }
  return false;
}

export function invoiceOpenBalanceCents(inv: InvoiceRow): number {
  return Math.max(0, inv.amount_cents - inv.amount_paid_cents);
}
