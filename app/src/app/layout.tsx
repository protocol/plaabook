import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AnalyticsInit } from '@/components/AnalyticsInit';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  /* pending Camille review */
  title: 'PLAAbook — Knowledge Base',
  description: 'Share, find, and request docs, Skills, and reading recommendations across the PL Network.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AnalyticsInit />
        {children}
      </body>
    </html>
  );
}
