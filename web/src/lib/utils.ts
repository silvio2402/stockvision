import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  // If string is an ISO date-time without timezone, append 'Z' to treat as UTC
  if (typeof date === "string" && !date.endsWith("Z") && date.includes("T")) {
    return new Date(date + "Z");
  }
  return new Date(date);
}

export function formatDate(date: string | Date): string {
  const d = parseDate(date);
  return d.toLocaleString();
}

export function formatRelativeTime(date: string | Date): string {
  const d = parseDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}