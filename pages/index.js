// pages/index.js
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Political Compass</h1>
              <p className="text-sm text-gray-500">find your footing</p>
            </div>
            <div className="flex gap-3">
              {user ? (
                <>
                  <Link
                    href="/feed"
                    className="px-4 py-2 rounded border bg-white hover:bg-gray-50 text-sm font-medium"
                  >
                    Feed
                  </Link>
                  <Link
                    href="/profile"
                    className="px-4 py-2 rounded border bg-white hover:bg-gray-50 text-sm font-medium"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/quiz"
                    className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
                  >
                    Take Quiz
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Discover Your Political Position
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Take our comprehensive quiz to map your political beliefs across economic, social, global, and progressive dimensions.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/quiz"
            className="inline-block px-8 py-4 rounded-lg bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 transition-colors text-center"
          >
            Take the Quiz
          </Link>
          {user && (
            <Link
              href="/feed"
              className="inline-block px-8 py-4 rounded-lg border-2 border-indigo-600 text-indigo-600 font-semibold text-lg hover:bg-indigo-50 transition-colors text-center"
            >
              View Feed
            </Link>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">4-Dimensional Analysis</h3>
            <p className="text-gray-600">
              Measure your position across economic, social, global vs national, and progressive vs conservative axes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Compare with Others</h3>
            <p className="text-gray-600">
              See how your views align with friends, public figures, and notable politicians.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Hot Topics</h3>
            <p className="text-gray-600">
              Respond to current political events and see how your positions shift in real-time.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Answer Questions</h4>
              <p className="text-sm text-gray-600">
                Respond to 40 carefully crafted political statements
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">Get Your Results</h4>
              <p className="text-sm text-gray-600">
                See your position on the political compass
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Follow Others</h4>
              <p className="text-sm text-gray-600">
                Connect with users who share similar or different views
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold mb-2">Explore the Feed</h4>
              <p className="text-sm text-gray-600">
                See how others answer questions and engage with the community
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-20 text-center bg-white p-12 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-3xl font-bold mb-4">Ready to Find Your Political Position?</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have discovered where they stand on the political spectrum.
          </p>
          <Link
            href="/quiz"
            className="inline-block px-8 py-4 rounded-lg bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 transition-colors"
          >
            Start the Quiz
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>Political Compass · v0.1 MVP</p>
            <p className="mt-2">Find your political footing</p>
          </div>
        </div>
      </footer>
    </div>
  );
}