import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTokenBalance(balance: number): string {
  if (balance >= 1000000000000) {
    return (balance / 1000000000000).toFixed(2).replace(/\.00$/, '') + 'T';
  }
  if (balance >= 1000000000) {
    return (balance / 1000000000).toFixed(2).replace(/\.00$/, '') + 'B';
  }
  return balance.toLocaleString();
}
