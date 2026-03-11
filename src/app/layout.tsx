import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ren Academy — Admin",
  description: "Admin panel for Ren Academy IELTS platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
            crypto.randomUUID = function() {
              return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, function(c) {
                return (c ^ (Math.random() * 16 >> c / 4)).toString(16);
              });
            };
          }
        `}} />
      </head>
      <body className={`${geistSans.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
