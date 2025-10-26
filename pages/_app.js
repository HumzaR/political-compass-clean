// pages/_app.js
import "../styles/globals.css"; // use the /styles file, not alias
import Sidebar from "@/components/Sidebar";

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen flex bg-white text-gray-900">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
