import type { ButtonVariant, ButtonSize, ButtonRounded } from './button-types';

export const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-700 shadow-sm hover:shadow-md',
  default: 'bg-white border border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900',
  secondary: 'border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800',
  danger: 'bg-white border border-red-300 text-red-600 hover:border-red-500 hover:bg-red-50 active:bg-red-100',
  dangerGhost: 'text-red-500 hover:bg-red-50 active:bg-red-100',
  ghost: 'text-zinc-600 hover:bg-zinc-100',
  link: 'text-zinc-900 hover:underline',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-sm hover:shadow-md',
  warning: 'bg-amber-500 text-white hover:bg-amber-400 active:bg-amber-600 shadow-sm hover:shadow-md',
  filled: 'bg-transparent text-zinc-400 hover:text-zinc-700 active:text-zinc-900 border-none',
};

export const sizePadding: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-1.5 text-sm',
  lg: 'px-6 py-2 text-base',
};

export const iconOnlySize: Record<ButtonSize, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
};

export const roundedStyles: Record<ButtonRounded, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
  none: 'rounded-none',
};

export const BASE_BUTTON_CLASSES =
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:scale-[0.97] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
