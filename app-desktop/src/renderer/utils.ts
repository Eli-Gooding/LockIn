import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return twMerge(inputs.filter(Boolean).join(' '));
} 