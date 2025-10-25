// pages/_app.js
import "@/styles/globals.css";
import Sidebar from "../components/ProfileAISidebar"; // ⬅ use this exact file
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  // (Optional) prevent FOUC when Tailwind dark mode is used, safe to keep
  useEffect(() => {}, []);
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
