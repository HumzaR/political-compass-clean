// pages/_app.js
import "../styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

// Ensure Firebase side-effect init (config in lib/firebase)
import "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Global providers your pages rely on
import { AnswersProvider } from "@/lib/answers";

// Sidebar (shown only when logged in)
import Sidebar from "@/components/Sidebar";

// Light theme as default (requires next-themes)
import { ThemeProvider } from "next-themes";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => setUser(u));
    return () => unsub();
  }, []);

  // Redirect signed-in users from "/" -> "/feed"
  useEffect(() => {
    if (user === undefined) return;
    if (user && router.pathname === "/") router.replace("/feed");
  }, [user, router]);

  // Avoid flicker during initial auth check
  if (user === undefined) return null;

  const showSidebar = !!user;

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AnswersProvider>
        <div className="min-h-screen w-full flex">
          {showSidebar ? (
            <div className="hidden md:block">
              <Sidebar />
            </div>
          ) : null}
          <main className="flex-1">
            <Component {...pageProps} />
          </main>
        </div>
      </AnswersProvider>
    </ThemeProvider>
  );
}
