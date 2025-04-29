import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Use Geist Sans
// GeistMono removed in previous step as it wasn't found
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

// Removed the function call as GeistSans is an object with properties like .variable
// const geistSans = GeistSans({
//   variable: '--font-geist-sans',
// });

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
    // Add 'dark' class to enforce dark mode
    <html lang="en" className="dark">
      {/* Apply the font variable directly from the imported object */}
      <body className={`${GeistSans.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
