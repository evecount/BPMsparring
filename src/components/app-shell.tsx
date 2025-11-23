'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Swords, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './icons';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="hidden sm:inline-block">Digital Spar</span>
        </Link>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <nav className="sticky bottom-0 z-10 flex items-center justify-center gap-4 border-t bg-background p-2">
        <Link
          href="/"
          className={cn(
            'flex flex-col items-center gap-1 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            pathname === '/' && 'text-primary'
          )}
        >
          <Swords className="h-5 w-5" />
          <span>Sparring</span>
        </Link>
        <Link
          href="/leaderboard"
          className={cn(
            'flex flex-col items-center gap-1 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            pathname === '/leaderboard' && 'text-primary'
          )}
        >
          <Trophy className="h-5 w-5" />
          <span>Leaderboard</span>
        </Link>
      </nav>
    </div>
  );
}
