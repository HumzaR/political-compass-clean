// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Home,
  ListChecks,
  BarChartHorizontal,
  Flame,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { label: "Home",        href: "/",           icon: Home },
  { label: "My Profile",  href: "/profile",    icon: User },
  { label: "My Answers",  href: "/my-answers", icon: ListChecks },
  { label: "Hot Topics",  href: "/hot-topics", icon: Flame },
  { label: "Settings",    href: "/settings",   icon: Settings },
  
];

export default function Sidebar() {
  const pathname = usePathname() || "/";

  return (
    <aside className="w-60 shrink-0 border-r bg-white text-gray-900">
      <div className="px-4 py-3 text-base font-semibold">Political Compass</div>

      <nav className="px-2 pb-4 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
