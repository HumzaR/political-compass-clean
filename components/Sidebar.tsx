// components/Sidebar.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { User, ListChecks, Notebook, Flag } from "lucide-react";
import { ReactNode } from "react";
import clsx from "clsx";

// If you don't already have clsx installed, run: npm i clsx
// Tailwind classes assume your existing setup.

type NavItem = {
  title: string;
  href: string;
  icon: (props: { className?: string }) => ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { title: "Profile", href: "/profile", icon: User },
  { title: "Quiz", href: "/quiz", icon: ListChecks },
  // Removed: { title: "Results", href: "/results", icon: BarChart3 }
  { title: "My Answers", href: "/my-answers", icon: Notebook }, // <- corrected link
  { title: "Party Match", href: "/party-match", icon: Flag },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="p-4">
        <h2 className="text-lg font-semibold tracking-tight">Navigation</h2>
      </div>
      <nav className="px-2 pb-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            router.pathname === item.href ||
            (item.href !== "/" && router.pathname.startsWith(item.href));

          const Icon = item.icon as any;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
