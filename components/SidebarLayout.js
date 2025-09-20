// components/SidebarLayout.js
import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/quiz', label: 'Quiz' },
  { href: '/results', label: 'Results' },
  { href: '/my-answers', label: 'My Answers' }, // ✅ NEW
  { href: '/login', label: 'Login' },
];

export default function SidebarLayout({ children }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-white p-4">
        <h1 className="text-lg font-bold mb-6">Political Compass</h1>
        <nav className="flex flex-col gap-2">
          {NAV.map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 rounded transition ${
                  active ? 'bg-black text-white' : 'hover:bg-gray-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
