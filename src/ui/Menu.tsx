import { useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';

export interface MenuItem {
  label: string;
  onSelect: () => void;
}

// Secondary actions (view, edit, copy, delete) live behind this one button, so the row itself
// can be a single large target for the main action, reviewing.
// The three dots are the only icon in the app. They are a text glyph, not an image
export function Menu({ items, label }: { items: MenuItem[]; label?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as globalThis.Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className="relative shrink-0">
      <button
        type="button"
        aria-label={label ?? t.menu.open}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="h-9 w-9 rounded-full font-gothic text-lg leading-none text-usuzumi"
      >
        ⋯
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute top-full right-0 z-10 mt-1 min-w-36 rounded border border-rule bg-surface py-1"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className="w-full px-4 py-2 text-left font-gothic text-sm whitespace-nowrap text-sumi"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
