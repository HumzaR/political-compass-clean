// pages/_app.js
import "../styles/globals.css";
import Sidebar from "@/components/Sidebar";
import { AnswersProvider } from "@/lib/answers";

export default function App({ Component, pageProps }) {
  return (
    <AnswersProvider>
      <div className="min-h-screen flex bg-white text-gray-900">
        <Sidebar />
        <main className="flex-1 p-4">
          <Component {...pageProps} />
        </main>
      </div>
    </AnswersProvider>
  );
}
