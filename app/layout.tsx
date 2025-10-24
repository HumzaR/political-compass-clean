import "./globals.css";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex h-full bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}
