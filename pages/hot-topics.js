// pages/hot-topics.js
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

function HotTopicsInner() {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined=checking, null=not logged in
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(null); // topicId being answered
  const [errors, setErrors] = useState({}); // topicId -> error string
  const [answeredMap, setAnsweredMap] = useState({}); // topicId -> true

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // Load active topics (newest first) + which ones current user already answered
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1) load topics
        const tq = query(
          collection(db, "hotTopics"),
          where("active", "==", true),
          orderBy("createdAt", "desc")
        );
        const ts = await getDocs(tq);
        const list = ts.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTopics(list);

        // 2) mark answered (if logged in)
        if (user) {
          const aq = query(
            collection(db, "hotTopicResponses"),
            where("uid", "==", user.uid)
          );
          const as = await getDocs(aq);
          const map = {};
          as.docs.forEach((d) => {
            const { topicId } = d.data() || {};
            if (topicId) map[topicId] = true;
          });
          setAnsweredMap(map);
        } else {
          setAnsweredMap({});
        }
      } finally {
        setLoading(false);
      }
    };
    // Run when user state known (or on change)
    if (user !== undefined) load();
  }, [user, db]);

  const answerTopic = async (topic, value) => {
    if (!user) {
      router.push("/login");
      return;
    }
    setErrors((e) => ({ ...e, [topic.id]: "" }));
    setAnswering(topic.id);
    try {
      // 1) Save response (one per user/topic; simple client-side check)
      await addDoc(collection(db, "hotTopicResponses"), {
        uid: user.uid,
        topicId: topic.id,
        value, // 1..5
        createdAt: serverTimestamp(),
      });

      // 2) Compute deltas and increment on profile
      const contrib = (value - 3) * (topic.weight ?? 1) * (topic.direction ?? 1);
      const econInc = topic.axis === "economic" ? contrib : 0;
      const socInc = topic.axis === "social" ? contrib : 0;

      await setDoc(
        doc(db, "profiles", user.uid),
        {
          uid: user.uid,
          hotEconDelta: increment(econInc),
          hotSocDelta: increment(socInc),
          hotUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3) Update UI state
      setAnsweredMap((m) => ({ ...m, [topic.id]: true }));
    } catch (e) {
      setErrors((er) => ({
        ...er,
        [topic.id]:
          e?.code === "permission-denied"
            ? "Not allowed (check Firestore rules)."
            : e?.message || "Failed to submit.",
      }));
    } finally {
      setAnswering(null);
    }
  };

  // Render helpers
  const TopicCard = ({ t }) => {
    const already = !!answeredMap[t.id];
    const disabled = already || answering === t.id;
    const isScale = (t.type || "scale") === "scale";

    const handleScale = (n) => answerTopic(t, n);
    const handleYes = () => answerTopic(t, 5);
    const handleNo = () => answerTopic(t, 1);

    return (
      <div className="bg-white rounded-xl border p-4 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{t.text}</h3>
          {t.createdAt?.toDate && (
            <span className="text-xs text-gray-500">
              {t.createdAt.toDate().toLocaleDateString()}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Axis: <span className="font-medium">{t.axis}</span> · Weight:{" "}
          <span className="font-medium">{t.weight ?? 1}</span>
        </p>

        <div className="mt-4">
          {isScale ? (
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  disabled={disabled}
                  onClick={() => handleScale(n)}
                  className={[
                    "py-2 rounded border",
                    disabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white hover:border-indigo-400",
                  ].join(" ")}
                  title={already ? "Already answered" : "Submit answer"}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                disabled={disabled}
                onClick={handleYes}
                className={[
                  "px-4 py-2 rounded border font-semibold",
                  disabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:border-indigo-400",
                ].join(" ")}
              >
                Yes
              </button>
              <button
                disabled={disabled}
                onClick={handleNo}
                className={[
                  "px-4 py-2 rounded border font-semibold",
                  disabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:border-indigo-400",
                ].join(" ")}
              >
                No
              </button>
            </div>
          )}
        </div>

        {already && (
          <p className="text-green-700 text-sm mt-3">Answer recorded ✓</p>
        )}
        {errors[t.id] && (
          <p className="text-red-600 text-sm mt-3">{errors[t.id]}</p>
        )}
      </div>
    );
  };

  if (user === undefined || loading) {
    return <p className="text-center mt-10">Loading hot topics…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 text-center">Hot Topics</h1>
      <p className="text-gray-600 text-center mb-6">
        Current-affairs questions that evolve your profile over time.
      </p>

      <div className="space-y-4">
        {topics.length === 0 ? (
          <p className="text-center text-gray-600">No active topics right now.</p>
        ) : (
          topics.map((t) => <TopicCard key={t.id} t={t} />)
        )}
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(HotTopicsInner), { ssr: false });
