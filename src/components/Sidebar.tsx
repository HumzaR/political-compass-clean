// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListChecks,
  BarChartHorizontal,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "My Answers", href: "/my-answers", icon: ListChecks },
  { label: "Results", href: "/results", icon: BarChartHorizontal },
];

export default function Sidebar() {
  const pathname = usePathname() ?? "/";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 min-h-screen p-4">
      <nav>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  isActive(href)
                    ? "bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
