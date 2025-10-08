// pages/feed.js
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import questions from "../data/questions";

export default function Feed() {
  const router = useRouter();
  const [user, setUser] = useState(undefined);
  const [activeFilter, setActiveFilter] = useState("all");
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  // Load feed data
  useEffect(() => {
    if (!user) return;

    const loadFeed = async () => {
      setLoading(true);
      try {
        const items = [];

        // Get users I'm following
        const followingQ = query(
          collection(db, "follows"),
          where("followerUid", "==", user.uid)
        );
        const followingSnap = await getDocs(followingQ);
        const followingUids = followingSnap.docs.map(
          (d) => d.data().followeeUid
        );

        // Include my own answers in "all" view
        const allUids = [...new Set([...followingUids, user.uid])];

        // Fetch profiles and answers for each user
        for (const uid of allUids) {
          const profileSnap = await getDoc(doc(db, "profiles", uid));
          if (!profileSnap.exists()) continue;

          const profile = { id: uid, ...profileSnap.data() };

          const answersSnap = await getDoc(doc(db, "answers", uid));
          if (!answersSnap.exists()) continue;

          const answersData = answersSnap.data();
          const answers = answersData.answers || {};
          const updatedAt = answersData.updatedAt || Date.now();

          // Get latest result for compass position
          const resultSnap = profile.lastResultId
            ? await getDoc(doc(db, "results", profile.lastResultId))
            : null;
          const result = resultSnap?.exists() ? resultSnap.data() : null;

          // Create feed items for each answered question
          Object.entries(answers).forEach(([qId, answerValue]) => {
            const question = questions.find((q) => q.id === Number(qId));
            if (!question) return;

            items.push({
              id: `${uid}-${qId}-${updatedAt}`,
              user: {
                name: profile.displayName || profile.username || "User",
                username: profile.username,
                uid: uid,
                isNotable: profile.isNotable || false,
                position: {
                  economic: result?.economicScore || 0,
                  social: result?.socialScore || 0,
                },
              },
              question: question.text,
              questionId: question.id,
              answer: answerValue,
              answerLabel: getAnswerLabel(question, answerValue),
              axis: question.axis,
              timestamp: new Date(updatedAt),
              likes: 0,
              comments: 0,
            });
          });
        }

        // Sort by timestamp (most recent first)
        items.sort((a, b) => b.timestamp - a.timestamp);

        setFeedItems(items);
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, [user]);

  // Filter feed items
  const filteredItems = useMemo(() => {
    if (activeFilter === "following") {
      return feedItems.filter((item) => item.user.uid !== user?.uid);
    }
    if (activeFilter === "notable") {
      return feedItems.filter((item) => item.user.isNotable);
    }
    if (activeFilter === "trending") {
      return feedItems.slice(0, 20);
    }
    return feedItems;
  }, [feedItems, activeFilter, user]);

  // Helper functions
  function getAnswerLabel(question, value) {
    const v = Number(value);
    if (!Number.isFinite(v)) return "Not answered";

    if (question.type === "yesno") {
      return v >= 3 ? "Yes" : "No";
    }

    const labels = {
      1: "Strongly Disagree",
      2: "Disagree",
      3: "Neutral",
      4: "Agree",
      5: "Strongly Agree",
    };
    return labels[v] || String(v);
  }

  function getAnswerColor(label) {
    if (label.includes("Strongly Agree") || label === "Yes")
      return "text-green-600 bg-green-50";
    if (label.includes("Agree")) return "text-green-500 bg-green-50";
    if (label.includes("Strongly Disagree"))
      return "text-red-600 bg-red-50";
    if (label.includes("Disagree") || label === "No")
      return "text-red-500 bg-red-50";
    return "text-gray-600 bg-gray-50";
  }

  function getStanceColor(econ) {
    if (econ < -2) return "bg-red-500";
    if (econ > 2) return "bg-blue-500";
    return "bg-purple-500";
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  if (user === undefined || loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center mt-10">Loading feed…</p>
      </div>
    );
  }

  if (user === null) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Political Feed</h1>
          <div className="flex gap-2">
            <Link
              href="/profile"
              className="px-4 py-2 rounded border bg-white hover:bg-gray-50 text-sm font-medium"
            >
              My Profile
            </Link>
            <Link
              href="/quiz"
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
            >
              Take Quiz
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("following")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "following"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Following
          </button>
          <button
            onClick={() => setActiveFilter("notable")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "notable"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Notable Figures
          </button>
          <button
            onClick={() => setActiveFilter("trending")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === "trending"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Trending
          </button>
        </div>
      </div>

      {/* Feed Items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              No feed items yet. Follow other users to see their answers here!
            </p>
            <Link
              href="/quiz"
              className="inline-block px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              Take the Quiz
            </Link>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded shadow overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* User Header */}
              <div className="p-4 flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {item.user.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">
                      {item.user.name}
                    </h3>
                    {item.user.isNotable && (
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        Notable Figure
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {item.user.username && `@${item.user.username} · `}
                    {formatTimeAgo(item.timestamp)}
                  </p>
                </div>

                {/* Compass Position */}
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  <div
                    className={`w-2 h-2 rounded-full ${getStanceColor(
                      item.user.position.economic
                    )}`}
                  ></div>
                  <span>
                    ({item.user.position.economic.toFixed(1)},{" "}
                    {item.user.position.social.toFixed(1)})
                  </span>
                </div>
              </div>

              {/* Question & Answer */}
              <div className="px-4 pb-4">
                <div className="bg-slate-50 rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">
                      {item.axis}
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium mb-3">
                    {item.question}
                  </p>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Answer:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getAnswerColor(
                        item.answerLabel
                      )}`}
                    >
                      {item.answerLabel}
                    </span>
                  </div>
                </div>

                {/* Engagement Buttons */}
                <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                  <button className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                      />
                    </svg>
                    <span className="text-sm font-medium">{item.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      {item.comments}
                    </span>
                  </button>
                  {item.user.username && (
                    <Link
                      href={`/u/${item.user.username}`}
                      className="ml-auto text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View Profile →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredItems.length > 0 && (
        <div className="mt-6">
          <button className="w-full py-3 bg-white border-2 border-gray-200 rounded text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            Load More Responses
          </button>
        </div>
      )}
    </div>
  );
}