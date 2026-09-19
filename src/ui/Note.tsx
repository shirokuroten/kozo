import type { ReactNode } from 'react';
import { Button } from './Button';
import { navigate } from './route';

export function Note({ children }: { children: ReactNode }) {
  return <p className="font-gothic text-sm text-usuzumi">{children}</p>;
}

export function NotFound({ children }: { children: ReactNode }) {
  return (
    <div>
      <Note>{children}</Note>
      <Button kind="text" onClick={() => navigate({ name: 'home' })}>
        戻る
      </Button>
    </div>
  );
}
