
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppShell } from '@/components/app-shell';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useEffect } from 'react';


// This can't be a server component because of the context usage
// export const metadata: Metadata = {
//   title: 'BPMSPARRING',
//   description: 'Reactive AI feedback loop demo.',
// };

function AppBody({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.title = 'BPMSPARRING';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Reactive AI feedback loop demo.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Reactive AI feedback loop demo.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <body>
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
        <AppBody>
          {children}
        </AppBody>
      </FirebaseClientProvider>
    </html>
  );
}
