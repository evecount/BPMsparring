'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Swords, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from './icons';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span>Digital Spar</span>
        </Link>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <nav className="sticky bottom-0 z-10 flex items-center justify-center gap-4 border-t bg-background p-2 md:hidden">
        <Link
          href="/"
          className={cn(
            'flex flex-col items-center gap-1 rounded-md p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            pathname === '/' && 'text-primary'
          )}
        >
          <Swords className="h-5 w-5" />
          <span>Sparring</span>
        </Link>
        <Link
          href="/leaderboard"
          className={cn(
            'flex flex-col items-center gap-1 rounded-md p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            pathname === '/leaderboard' && 'text-primary'
          )}
        >
          <Trophy className="h-5 w-5" />
          <span>Leaderboard</span>
        </Link>
      </nav>

      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r">
          <div className="flex flex-col flex-1 overflow-y-auto bg-sidebar text-sidebar-foreground">
            <div className="flex items-center flex-shrink-0 px-4 h-16 border-b border-sidebar-border">
                <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-primary">
                    <Logo className="h-6 w-6" />
                    <span>Digital Spar</span>
                </Link>
            </div>
            <div className="flex-1 p-2">
                <nav className="flex flex-col gap-1">
                    <Link
                    href="/"
                    className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        pathname === '/' && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                    >
                        <Swords className="h-5 w-5" />
                        <span>Sparring</span>
                    </Link>
                    <Link
                    href="/leaderboard"
                    className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        pathname === '/leaderboard' && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                    >
                        <Trophy className="h-5 w-5" />
                        <span>Leaderboard</span>
                    </Link>
                </nav>
            </div>
          </div>
      </div>
       <div className="hidden md:block md:pl-64 flex-1">
         {children}
        </div>

    </div>
  );
}
