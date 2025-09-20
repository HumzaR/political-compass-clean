// components/SidebarLayout.js
import Link from 'next/link';
import { useRouter } from 'next/router';

function NavLink({ href, children }) {
  const router = useRouter();
  const active = router.pathname === href;
  return (
    <Link
      href={href}
      className={`block px-4 py-2 rounded transition ${
        active ? 'bg-black text-white' : 'hover:bg-gray-200'
      }`}
    >
      {children}
    </Link>
  );
}

export default function SidebarLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-white p-4">
        <h1 className="text-lg font-bold mb-6">Political Compass</h1>
        <nav className="flex flex-col gap-2">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/quiz">Quiz</NavLink>
          <NavLink href="/results">Results</NavLink>

          {/* ✅ Added link */}
          <NavLink href="/my-answers">My Answers</NavLink>

          <NavLink href="/hot-topics">Hot Topics</NavLink>
          <NavLink href="/profile">My Profile</NavLink>
          <NavLink href="/settings">Settings</NavLink>
          <NavLink href="/login">Login</NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
