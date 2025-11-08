// pages/_app.js
import "../styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";

// Ensure Firebase is initialized (side-effect import)
import "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out, object = signed in

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // If logged in and on Home (/), redirect to /feed
  useEffect(() => {
    if (user === undefined) return; // still checking auth
    if (user && router.pathname === "/") {
      router.replace("/feed");
    }
  }, [user, router]);

  // Avoid flicker while we determine auth
  if (user === undefined) return null;

  // Show Sidebar only when logged in
  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-gray-950">
      {user ? (
        <div className="hidden md:block">
          <Sidebar />
        </div>
      ) : null}

      <main className="flex-1">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
