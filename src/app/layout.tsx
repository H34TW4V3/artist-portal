import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Use Geist Sans
// Removed GeistMono import as it's not found/needed currently
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

const geistSans = GeistSans({
  variable: '--font-geist-sans',
  // subsets: ['latin'], // Subsets are often inferred
});

// Removed geistMono variable

export const metadata: Metadata = {
  title: 'Artist Hub', // Updated App Name
  description: 'Manage your music releases and view streaming statistics.', // Updated Description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}> {/* Apply only sans-serif font variable */}
        {children}
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
