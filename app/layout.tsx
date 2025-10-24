// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <div className="mx-auto flex min-h-screen max-w-7xl">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
