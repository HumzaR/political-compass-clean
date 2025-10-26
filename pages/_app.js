// pages/_app.js
import "../styles/globals.css";             // use the file under /styles to avoid alias confusion
import Sidebar from "@/components/Sidebar"; // the component above
import { AnswersProvider } from "@/lib/answers";

export default function App({ Component, pageProps }) {
  return (
    <AnswersProvider>
      <div className="min-h-screen flex bg-gray-50 text-gray-900">
        <Sidebar />
        <main className="flex-1 p-6">
          <Component {...pageProps} />
        </main>
      </div>
    </AnswersProvider>
  );
}
