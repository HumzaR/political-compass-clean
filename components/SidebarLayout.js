// components/SidebarLayout.js
import Link from "next/link";
import { useRouter } from "next/router";

export default function SidebarLayout({ children }) {
  const router = useRouter();

  const isActive = (href) => router.pathname === href;

  const NavLink = ({ href, label }) => (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 px-3 py-2 rounded-lg transition",
        isActive(href)
          ? "bg-indigo-50 text-indigo-700 font-semibold"
          : "text-gray-700 hover:bg-gray-100",
      ].join(" ")}
    >
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 md:pl-64">
      {/* Sidebar (fixed on left, hidden on small screens) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 border-r bg-white">
        <div className="flex flex-col w-full h-full p-4">
          {/* Brand */}
          <div className="mb-6">
            <Link href="/" className="block">
              <div className="text-xl font-bold text-indigo-700">Political Compass</div>
              <div className="text-xs text-gray-500">find your footing</div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            <NavLink href="/profile" label="My Profile" />
            <NavLink href="/hot-topics" label="Hot Topics" />
            <div className="h-px my-2 bg-gray-200" />
            <NavLink href="/settings" label="Settings" />
          </nav>

          <div className="mt-auto pt-4 text-xs text-gray-400">v0.1 • MVP</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
