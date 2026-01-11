import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import styles from './site.module.css'
import Header from '../components/Header'
import { ToastProvider } from '../components/ui/ToastContext'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Giraffe Family Center',
  description: 'Management system for the family entertainment center',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ToastProvider>
          <Header />
          <main className={styles.siteContainer}>{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}
