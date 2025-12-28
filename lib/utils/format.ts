import { format as dateFnsFormat, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Format date to Vietnamese format
 */
export function formatDate(
  date: string | Date,
  format: string = "dd/MM/yyyy"
): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return dateFnsFormat(dateObj, format, { locale: vi });
  } catch (error) {
    return "";
  }
}

/**
 * Format datetime to Vietnamese format
 */
export function formatDateTime(
  date: string | Date,
  format: string = "dd/MM/yyyy HH:mm"
): string {
  return formatDate(date, format);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/**
 * Format number
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("vi-VN").format(num);
}


