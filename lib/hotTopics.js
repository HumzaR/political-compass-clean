// lib/hotTopics.js
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Shape of /hotTopics/{topicId} expected:
// {
//   id: string (doc id),
//   questionId: string,              // must exist in data/questions.js
//   title: string,
//   options: [{ label: string, value: number }], // 1..5 map to your scale
//   activeFrom: Timestamp,           // when it should appear
//   createdAt: Timestamp
// }

const db = getFirestore();

// Unanswered topics for a user (newest first)
export async function fetchUnansweredHotTopics(uid, max = 10) {
  // Topics currently active or in the past
  const q = query(
    collection(db, "hotTopics"),
    orderBy("activeFrom", "desc"),
    limit(20)
  );

  const snap = await getDocs(q);
  if (snap.empty) return [];

  // Fetch responses for this user to filter answered ones
  // We will build a set of topicIds the user has answered
  const topicIds = snap.docs.map((d) => d.id);
  const answered = new Set();

  // Batch fetch responses for these topics using deterministic ids <topicId>_<uid>
  // We just try to read each doc; small N (<=20) so it's okay.
  // If you want to optimize, you can index a collection group query later.
  const reads = topicIds.map(async (tid) => {
    const rid = `${tid}_${uid}`;
    const ref = doc(db, "hotTopicResponses", rid);
    const rs = await getDocs(query(collection(db, "hotTopicResponses"), where("__name__", "==", rid)));
    if (!rs.empty) answered.add(tid);
  });
  await Promise.all(reads);

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !answered.has(t.id));
}

// Record the user’s choice:
// 1) write /hotTopicResponses/<topicId>_<uid>
// 2) merge into /answers/{uid}.answersById[questionId] = value  (triggers results compute)
export async function answerHotTopic({ topic, value }) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const uid = user.uid;

  const respId = `${topic.id}_${uid}`;
  const respRef = doc(db, "hotTopicResponses", respId);

  await setDoc(respRef, {
    uid,
    topicId: topic.id,
    questionId: topic.questionId,
    value,
    title: topic.title,
    answeredAt: serverTimestamp(),
  });

  // Merge into the user’s answers
  const answersRef = doc(db, "answers", uid);
  await updateDoc(answersRef, {
    [`answersById.${topic.questionId}`]: value,
    updatedAt: serverTimestamp(),
  });
}
