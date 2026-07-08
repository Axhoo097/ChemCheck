import type { Metadata } from 'next';
import './globals.css';
import { ReduxProvider } from '../store/Provider';

export const metadata: Metadata = {
  title: 'ChemCheck - AI Powered Chemical Safety Analyzer',
  description: 'Scan and analyze the chemical ingredients of your products for a healthier lifestyle.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased selection:bg-teal-500/30">
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
