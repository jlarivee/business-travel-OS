import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function money(value, currency = 'USD') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unknown';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function listText(values) {
  if (!Array.isArray(values)) return '';
  return values.filter(Boolean).join(', ');
}
