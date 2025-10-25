// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Home, Compass, Flame, Settings } from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const NAV: Item[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/quiz", label: "Quiz", icon: Compass },
  { href: "/hot-topics", label: "Hot Topics", icon: Flame },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  // Works in both the Pages Router and App Router without importing next/router/next/navigation.
  const [path, setPath] = useState<string>("/");
  useEffect(() => {
    if (typeof window !== "undefined") setPath(window.location.pathname);
  }, []);

  return (
    <aside className="w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/70 backdrop-blur">
      <div className="p-4 text-lg font-semibold tracking-tight">Compass</div>
      <nav className="px-2 pb-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          const base =
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors";
          const inactive =
            "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-900";
          const activeCls =
            "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white";
          return (
            <Link
              key={href}
              href={href}
              className={`${base} ${active ? activeCls : inactive}`}
            >
              {/* Lucide icons inherit text color via currentColor */}
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
