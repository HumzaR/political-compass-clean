// src/components/Sidebar.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, ListChecks, BarChartHorizontal } from "lucide-react"; // pick any icons you like
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/my-answers", label: "My Answers", Icon: ListChecks },
  { href: "/results", label: "Results", Icon: BarChartHorizontal },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside className="hidden md:flex md:w-64 border-r border-gray-200 bg-white">
      <nav className="w-full p-4 space-y-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = router.pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                active ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className="shrink-0" size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
