
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Use Geist Sans
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

// Removed the function call as GeistSans is an object with properties like .variable

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
      <body className={`${GeistSans.variable} font-sans antialiased bg-background text-foreground relative min-h-screen`}>
        {/* Global Background Image - Increased opacity */}
        <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.08] dark:opacity-[0.10]" // Kept opacity values
            // Using the new requested background image
            style={{ backgroundImage: "url('https://t4.ftcdn.net/jpg/08/62/54/35/360_F_862543518_D0LQEQDZqkbTNM8CMB6iuiauhfaj4wr6.jpg')" }}
        />
        {/* Content wrapper */}
        <div className="relative z-10 min-h-screen flex flex-col">
             {children}
        </div>
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}

