import type { ButtonHTMLAttributes } from 'react';

type Kind = 'solid' | 'ghost' | 'text';

const KIND_CLASS: Record<Kind, string> = {
  solid: 'rounded-full bg-sumi px-4 py-2 text-paper',
  ghost: 'rounded-full border border-rule bg-surface px-4 py-2 text-sumi',
  text: 'py-2 text-usuzumi',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind;
}

export function Button({ kind = 'ghost', className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      className={`font-gothic text-sm disabled:opacity-40 ${KIND_CLASS[kind]} ${className}`}
      {...rest}
    />
  );
}
