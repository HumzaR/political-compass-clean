// pages/_app.js
import "../styles/globals.css";
import Sidebar from "@/components/Sidebar";
import { AnswersProvider } from "@/lib/answers";

export default function App({ Component, pageProps }) {
  return (
    <AnswersProvider>
      <div className="min-h-screen bg-white text-gray-900">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8">
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    </AnswersProvider>
  );
}
