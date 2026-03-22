import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
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
      <body className={`${geistSans.variable} antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster position="top-right" toastOptions={{ className: "!bg-[var(--card-bg)] !border-[var(--card-border)] !text-[var(--text-primary)]" }} />
      </body>
    </html>
  );
}
