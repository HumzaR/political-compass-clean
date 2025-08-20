import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 text-center">
      <h1 className="text-4xl font-bold mb-6 text-red-600">
        Welcome to the Political Compass App
      </h1>
      <p className="mb-8 text-lg text-gray-700">
        Take the quiz to find out where you stand.
      </p>
      <Link
        href="/quiz"
        className="px-6 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
      >
        Start the Quiz
      </Link>
    </div>
  );
}
