import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTokenBalance(balance: number, digits: number = 1): string {
  const num = typeof balance === 'string' ? Number(balance) : Number(balance);
  
  if (!isFinite(num)) return '0';
  
  const units = [
    { value: 1e15, suffix: 'Qn' },
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'K' },
  ];
  
  for (const unit of units) {
    if (Math.abs(num) >= unit.value) {
      const value = num / unit.value;
      const formatted = Number.isInteger(value) 
        ? value.toString() 
        : value.toFixed(digits).replace(/\.0+$/, '');
      return formatted + unit.suffix;
    }
  }
  
  return num.toLocaleString();
}
