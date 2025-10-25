"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListChecks,
  BarChart2,
  Flame,
  Users,
  UserCircle2,
  Settings
} from "lucide-react";
import { useMemo } from "react";

type NavItem = {
  label: string;
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export default function Sidebar() {
  const pathname = usePathname();

  const nav: NavItem[] = useMemo(
    () => [
      { label: "Home",         href: "/",            Icon: Home },
      { label: "Quiz",         href: "/quiz",        Icon: ListChecks },
      { label: "Results",      href: "/results",     Icon: BarChart2 },
      { label: "Hot Topics",   href: "/hot-topics",  Icon: Flame },
      { label: "Following",    href: "/following",   Icon: Users },
      { label: "Profile",      href: "/profile",     Icon: UserCircle2 },
      { label: "Settings",     href: "/settings",    Icon: Settings }
    ],
    []
  );

  return (
    <aside className="h-screen w-64 shrink-0 border-r border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-950">
      <div className="px-5 py-4 border-b border-neutral-200/70 dark:border-neutral-800/70">
        <Link href="/" className="block text-xl font-semibold tracking-tight">
          Political Compass
        </Link>
      </div>

      <nav className="p-3">
        <ul className="space-y-1">
          {nav.map(({ label, href, Icon }) => {
            const active =
              pathname === href ||
              (href !== "/" && pathname?.startsWith(href));

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                  ].join(" ")}
                >
                  {/* Icon */}
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
