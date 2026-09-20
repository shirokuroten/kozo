import type { ReactNode } from 'react';
import { Button } from './Button';
import { useI18n } from './i18n';
import { navigate } from './route';

export function Note({ children }: { children: ReactNode }) {
  return <p className="font-gothic text-sm text-usuzumi">{children}</p>;
}

export function NotFound({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div>
      <Note>{children}</Note>
      <Button kind="text" onClick={() => navigate({ name: 'home' })}>
        {t.common.back}
      </Button>
    </div>
  );
}
