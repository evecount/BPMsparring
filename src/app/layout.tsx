
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppShell } from '@/components/app-shell';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SparringContext, SparringProvider } from '@/context/SparringContext';
import { useContext, useEffect } from 'react';
import { cn } from '@/lib/utils';


// This can't be a server component because of the context usage
// export const metadata: Metadata = {
//   title: 'BPMsparring',
//   description: 'An AI-powered boxing coach to improve your skills.',
// };

function AppBody({ children }: { children: React.ReactNode }) {
  const { sessionState } = useContext(SparringContext);
  const isSparringActive = sessionState === 'running' || sessionState === 'paused' || sessionState === 'starting';

  useEffect(() => {
    document.title = 'BPMsparring';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'An AI-powered boxing coach to improve your skills.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'An AI-powered boxing coach to improve your skills.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <body className={cn(
      "font-body antialiased",
      isSparringActive && "sparring-active"
    )}>
      <AppShell>{children}</AppShell>
      <Toaster />
    </body>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <FirebaseClientProvider>
        <SparringProvider>
          <AppBody>
            {children}
          </AppBody>
        </SparringProvider>
      </FirebaseClientProvider>
    </html>
  );
}
