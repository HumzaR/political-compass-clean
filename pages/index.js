// pages/index.js
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

export default function Home() {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(
          collection(db, "hotTopics"),
          where("active", "==", true),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const qs = await getDocs(q);
        setTopics(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        setTopics([]);
      }
    };
    load();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 text-center">
      <h1 className="text-4xl font-bold mb-6 text-red-600">
        Welcome to the Political Compass App
      </h1>
      <p className="mb-8 text-lg text-gray-700">
        Take the quiz to find out where you stand.
      </p>
      <div className="flex gap-4">
        <Link
          href="/quiz"
          className="px-6 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
        >
          Start the Quiz
        </Link>
        <Link
          href="/hot-topics"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
        >
          Hot Topics
        </Link>
      </div>

      <div className="max-w-3xl w-full mt-10 px-4">
        <h2 className="text-2xl font-semibold mb-4 text-left">Trending Hot Topics</h2>
        <div className="space-y-3 text-left">
          {topics.length === 0 ? (
            <p className="text-gray-700">No active topics right now.</p>
          ) : (
            topics.map((t) => (
              <div key={t.id} className="bg-white border rounded p-3">
                <div className="font-medium">{t.text}</div>
                <div className="text-xs text-gray-600">
                  Axis: {t.axis} · Weight: {t.weight ?? 1}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
