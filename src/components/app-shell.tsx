
'use client';

import React from 'react';
import Link from 'next/link';
import { LogIn, LogOut, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './icons';
import { useUser } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = getAuth();

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-transparent px-4 sm:px-6 backdrop-blur-sm bg-background/30">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="hidden sm:inline-block">BPMSPARRING</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
            )}
          >
            <Info className="h-4 w-4" />
            <span>About</span>
          </Link>

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
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground'
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
      <footer className="p-4 text-center text-xs text-muted-foreground">
        © 2026 BPMsparring is a property of Eve Count Pte Ltd
      </footer>
    </div>
  );
}
