import type React from "react"
import type { Metadata } from "next"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "IEDC CEV | Game Arena",
  description: "Enter the IEDC CEV Game Arena — compete, earn, and climb the ranks.",
  icons: {
    icon: "/tvc.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              background: '#1a1a2e',
              border: '1px solid rgba(0, 245, 255, 0.15)',
              color: '#e8e8f0',
              fontFamily: 'var(--font-sans)',
            },
          }}
        />
      </body>
    </html>
  )
}
