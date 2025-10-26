'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import {
  Home,
  ListChecks,
  BarChart3,
  NotebookText,
  type LucideIcon,   // <-- add this
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;   // <-- use LucideIcon here
};

const nav: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/quiz', label: 'Quiz', icon: ListChecks },
  { href: '/results', label: 'Results', icon: BarChart3 },
  { href: '/my-answers', label: 'My Answers', icon: NotebookText },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="w-56 border-r bg-white">
      <nav className="p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = router.pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md transition',
                'hover:bg-gray-100',
                active && 'bg-gray-100 font-medium'
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
