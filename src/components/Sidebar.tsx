"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { User, FileText, Flame, Settings } from "lucide-react";
import clsx from "clsx";

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: Item[] = [
  { label: "My Profile", href: "/profile", icon: User },
  { label: "My Answers", href: "/my-answers", icon: FileText }, // <-- correct route
  { label: "Hot Topics", href: "/hot-topics", icon: Flame },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = router.pathname;

  return (
    <aside className="w-60 shrink-0 border-r bg-white">
      <div className="px-4 py-5">
        <h1 className="text-lg font-semibold">Political Compass</h1>
        <p className="text-xs text-gray-500">find your footing</p>
      </div>

      <nav className="px-2 pb-4 space-y-1">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 text-[10px] text-gray-400">v0.1 · MVP</div>
    </aside>
  );
}
