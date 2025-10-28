// app/layout.tsx
import "@/styles/globals.css";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"> {/* removed className="dark" if it was there */}
      <body className="bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}

