"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart2,
  Users,
  Flame,
  MessageSquare,
  Settings,
  User,
  LogIn,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/results", label: "Results", icon: BarChart2 },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/feed", label: "Feed", icon: Users },
  { href: "/hot-topics", label: "Hot Topics", icon: Flame },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/login", label: "Login", icon: LogIn },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: NavItem["icon"];
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors",
        active
          ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 shrink-0 border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-6 px-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-900 dark:bg-white" />
          <span className="text-base font-semibold">Political Compass</span>
        </Link>
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname?.startsWith(href));
          return (
            <NavLink
              key={href}
              href={href}
              label={label}
              Icon={Icon}
              active={!!active}
            />
          );
        })}
      </nav>
    </aside>
  );
}
