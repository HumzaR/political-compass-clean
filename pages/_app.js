// pages/_app.js
import "@/styles/globals.css";
import Sidebar from "@/components/Sidebar";

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased flex">
      <Sidebar />
      <main className="ml-64 flex-1 p-6">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
