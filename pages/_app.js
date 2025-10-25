// pages/_app.js
import "@/styles/globals.css";
import Sidebar from "@/components/Sidebar";

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
