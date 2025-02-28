import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LockIn',
  description: 'Stay focused on your tasks',
  generator: 'LockIn App',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
