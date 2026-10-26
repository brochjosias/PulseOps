'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    // A key={pathname} força o React a recriar a div toda vez que a rota mudar
    // disparando a animação CSS novamente
    <div key={pathname} className="animate-page-enter h-full w-full">
      {children}
    </div>
  );
}
