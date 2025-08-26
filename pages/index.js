// pages/index.js
import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 className="text-4xl font-bold mb-6 text-indigo-700">
        Welcome to the Political Compass App
      </h1>
      <p className="mb-8 text-lg text-gray-700">
        Take the quiz to find out where you stand.
      </p>
      <div className="flex gap-4 justify-center">
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
    </div>
  );
}
