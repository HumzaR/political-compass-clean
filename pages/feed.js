// pages/feed.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";

import HotTopicOverlay from "@/components/HotTopicOverlay";
import HotTopicsBar from "@/components/HotTopicsBar";
import { fetchUnansweredHotTopics, answerHotTopic } from "@/lib/hotTopics";

// -----------------------------------------------------------
// Helpers to fetch feed data (very lightweight, no pagination)
// -----------------------------------------------------------

const db = getFirestore();

// Get IDs the current user follows
async function fetchFollowees(uid) {
  const q = query(
    collection(db, "follows"),
    where("followerUid", "==", uid)
  );
  const snap = await getDocs(q);
  const followees = snap.docs.map((d) => d.data().followeeUid).filter(Boolean);
  // Include yourself so your own answers appear in your feed
  return Array.from(new Set([uid, ...followees]));
}

// Pull latest answers for a single user (we’ll just read the whole doc once)
async function fetchUserAnswers(uid) {
  const ref = doc(db, "answers", uid);
  const s = await getDoc(ref);
  return s.exists() ? { uid, ...s.data() } : null;
}

// Pull a user profile (display name, handle, etc.)
async function fetchUserProfile(uid) {
  const ref = doc(db, "profiles", uid);
  const s = await getDoc(ref);
  return s.exists() ? { uid, ...s.data() } : { uid };
}

// Transform answers into a flat list of “posts”
function answersToPosts(answersDoc, profilesByUid) {
  if (!answersDoc || !answersDoc.answersById) return [];
  const profile = profilesByUid[answersDoc.uid] || { displayName: "User" };

  const createdAt = answersDoc.updatedAt?.toDate?.() ?? null;

  return Object.entries(answersDoc.answersById).map(([questionId, value]) => ({
    id: `${answersDoc.uid}_${questionId}`,
    uid: answersDoc.uid,
    questionId,
    value,
    createdAt,
    profile,
  }));
}

// Basic label mapping to match 1..5 scale
const SCALE_LABELS = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

// -----------------------------------------------------------
// Page
// -----------------------------------------------------------

export default function FeedPage() {
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out, object = signed in

  // Feed state
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [posts, setPosts] = useState([]); // flattened posts
  const [profilesByUid, setProfilesByUid] = useState({});

  // Hot topics state
  const [pendingTopics, setPendingTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);

  // -----------------
  // Auth bootstrap
  // -----------------
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => setUser(u));
    return () => unsub();
  }, []);

  // -----------------
  // Fetch feed data
  // -----------------
  useEffect(() => {
    async function run() {
      if (!user) {
        setLoadingFeed(false);
        return;
      }
      setLoadingFeed(true);

      // 1) who I follow (plus me)
      const list = await fetchFollowees(user.uid);

      // 2) fetch answers + profiles
      const [answersDocs, profileDocs] = await Promise.all([
        Promise.all(list.map((uid) => fetchUserAnswers(uid))),
        Promise.all(list.map((uid) => fetchUserProfile(uid))),
      ]);

      const profilesMap = {};
      profileDocs.forEach((p) => {
        if (p?.uid) profilesMap[p.uid] = p;
      });
      setProfilesByUid(profilesMap);

      // 3) flatten into posts
      let flat = [];
      answersDocs
        .filter(Boolean)
        .forEach((adoc) => {
          flat = flat.concat(answersToPosts(adoc, profilesMap));
        });

      // 4) sort newest first (fallback to uid to keep stable order)
      flat.sort((a, b) => {
        const at = a.createdAt ? a.createdAt.getTime() : 0;
        const bt = b.createdAt ? b.createdAt.getTime() : 0;
        if (bt !== at) return bt - at;
        return a.id < b.id ? -1 : 1;
      });

      setPosts(flat);
      setLoadingFeed(false);
    }

    run();
  }, [user]);

  // -----------------
  // Hot Topics
  // -----------------
  useEffect(() => {
    async function loadHotTopics() {
      const u = getAuth().currentUser;
      if (!u) return;
      const topics = await fetchUnansweredHotTopics(u.uid);
      setPendingTopics(topics);

      // auto-open first topic not snoozed
      const snoozed = JSON.parse(localStorage.getItem("snoozedHotTopics") || "[]");
      const first = topics.find((t) => !snoozed.includes(t.id));
      if (first) setActiveTopic(first);
    }
    loadHotTopics();
  }, [user]);

  async function handleAnswer(value) {
    if (!activeTopic) return;
    await answerHotTopic({ topic: activeTopic, value });

    // Remove from pending and close overlay
    setPendingTopics((prev) => prev.filter((t) => t.id !== activeTopic.id));
    setActiveTopic(null);

    // Optionally refresh feed quickly (their answer updates /answers -> functions recompute)
    // We’ll optimistically add a stub post to the top:
    setPosts((prev) => [
      {
        id: `hot_${activeTopic.id}`,
        uid: user.uid,
        questionId: activeTopic.questionId,
        value,
        createdAt: new Date(),
        profile: profilesByUid[user.uid] || { displayName: "You" },
      },
      ...prev,
    ]);
  }

  function handleLater() {
    if (!activeTopic) return;
    const key = "snoozedHotTopics";
    const snoozed = JSON.parse(localStorage.getItem(key) || "[]");
    if (!snoozed.includes(activeTopic.id)) {
      localStorage.setItem(key, JSON.stringify([...snoozed, activeTopic.id]));
    }
    setActiveTopic(null);
  }

  function openFirstPending() {
    if (pendingTopics.length) setActiveTopic(pendingTopics[0]);
  }

  // -----------------
  // Render helpers
  // -----------------
  function renderSignedOut() {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-semibold mb-3">Political Feed</h1>
        <p className="text-gray-600 mb-6">
          Sign in to see your feed and daily Hot Topics.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  function renderPost(card) {
    const handle = card.profile?.username ? `@${card.profile.username}` : `@${card.uid.slice(0, 6)}`;
    const when =
      card.createdAt instanceof Date
        ? card.createdAt.toLocaleDateString()
        : "Invalid Date";

    return (
      <div
        key={card.id}
        className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-200 text-indigo-800 font-bold">
              {card.profile?.displayName?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="font-semibold">
                {card.profile?.displayName || "User"}
              </div>
              <div className="text-xs text-gray-500">
                {handle} · {when}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {/* placeholder for per-question contrib like (1.3, 1.0) */}
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="mb-2 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
            economic/social/global/progress
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="mb-2 font-medium">
              {/* You can replace this with the real question text lookup if you have it client-side */}
              Question: {card.questionId}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Answer: </span>
              <span className="font-medium">
                {SCALE_LABELS[card.value] || card.value}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-5">
              <span>👍 0</span>
              <span>💬 0</span>
            </div>
            <Link href={`/u/${card.profile?.username || card.uid}`} className="text-indigo-600 hover:underline">
              View Profile →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -----------------
  // Render
  // -----------------
  if (user === undefined) return null; // waiting on auth

  if (!user) {
    // Signed out: Feed requires login; also no sidebar (handled in _app.js)
    return renderSignedOut();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Hot Topics stack bar */}
      <HotTopicsBar count={pendingTopics.length} onOpen={openFirstPending} />

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Political Feed</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            My Profile
          </Link>
          <Link
            href="/quiz"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Take Quiz
          </Link>
        </div>
      </div>

      {/* Simple filters (non-functional placeholders for now, keeps your old look) */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button className="rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">
          All
        </button>
        <button className="rounded-full bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800">
          Following
        </button>
        <button className="rounded-full bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800">
          Notable Figures
        </button>
        <button className="rounded-full bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800">
          Trending
        </button>
      </div>

      {loadingFeed ? (
        <div className="text-gray-500">Loading feed…</div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          No posts yet. Follow people or answer Hot Topics to see updates here.
        </div>
      ) : (
        posts.map((p) => renderPost(p))
      )}

      {/* Overlay to answer the active Hot Topic */}
      <HotTopicOverlay
        topic={activeTopic}
        onAnswer={handleAnswer}
        onLater={handleLater}
      />
    </div>
  );
}
