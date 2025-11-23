
'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Swords, Trophy, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './icons';
import { useUser } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { SparringContext } from '@/context/SparringContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { sessionState, sessionStats } = useContext(SparringContext);
  const auth = getAuth();

  const handleSignOut = () => {
    signOut(auth);
  };

  const StatCard = ({ title, value }: { title: string; value: string | number }) => (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-transparent px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="hidden sm:inline-block">BPMsparring</span>
        </Link>
        <div>
          {!isUserLoading && (
            <>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/80 hover:text-white'
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground',
                    pathname === '/login' && 'text-primary'
                  )}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Link>
              )}
            </>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <nav className="sticky bottom-0 z-10 flex items-center justify-around glass-panel p-2">
        {sessionState === 'running' || sessionState === 'paused' ? (
          <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
            <StatCard title="Score" value={sessionStats.score} />
            <StatCard title="Punches" value={sessionStats.punches} />
            <StatCard title="Streak" value={sessionStats.streak} />
            <StatCard title="Accuracy" value={`${sessionStats.accuracy.toFixed(1)}%`} />
          </div>
        ) : (
          <>
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
          </>
        )}
      </nav>
    </div>
  );
}
