import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/layout/AppShell';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'ReachInbox – Production Grade Email Scheduler',
  description:
    'Distributed email scheduling platform capable of handling thousands of emails with dynamic rate limits, next-hour rollover, and BullMQ resilience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
