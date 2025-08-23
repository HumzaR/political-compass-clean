// pages/results.js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import questions from '../data/questions';

import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
  collection,
} from 'firebase/firestore';

export default function Results() {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [economicScore, setEconomicScore] = useState(null);
  const [socialScore, setSocialScore] = useState(null);
  const [debug, setDebug] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [user, setUser] = useState(null);

  const showDebug = process.env.NEXT_PUBLIC_DEBUG === '1';

  // Watch auth to know which uid to save under
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const answersStr = typeof router.query.answers === 'string' ? router.query.answers : '';
    const answerArray = answersStr
      ? answersStr.split(',').map((v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 3;
        })
      : [];

    // Build { [id]: value } answer map with safe default = 3 (neutral)
    const userAnswers = {};
    questions.forEach((q, i) => {
      const val = answerArray[i];
      userAnswers[q.id] = Number.isFinite(val) ? val : 3;
    });

    // Compute scores
    let econ = 0;
    let soc = 0;
    questions.forEach((q) => {
      const response = userAnswers[q.id];
      if (response === undefined || Number.isNaN(response)) return;
      const scaled = (response - 3) * (q.weight ?? 1) * (q.direction ?? 1);
      if (q.axis === 'economic') econ += scaled;
      else if (q.axis === 'social') soc += scaled;
    });

    setEconomicScore(econ);
    setSocialScore(soc);

    if (showDebug) {
      setDebug({
        isReady: router.isReady,
        answersStr,
        answerArray,
        mappedAnswers: userAnswers,
        econ,
        soc,
        questionCount: questions.length,
      });
    }

    // Save results and then redirect -> /profile
    (async () => {
      // Wait until we know auth state (either user or null)
      // If not logged in, just skip saving and stay on results.
      // (You could also redirect to /login, but keeping it simple.)
      let attempts = 0;
      while (attempts < 20 && user === null) {
        // yield to next tick while onAuthStateChanged fires
        await new Promise((r) => setTimeout(r, 50));
        attempts++;
      }

      if (!user) return; // not logged in; do not save

      try {
        setSaving(true);
        setSaveError('');

        // 1) Save the result
        const resultsRef = collection(db, 'results');
        const resultDoc = await addDoc(resultsRef, {
          uid: user.uid,
          economicScore: econ,
          socialScore: soc,
          answers: userAnswers,
          createdAt: serverTimestamp(),
        });

        // 2) Update profile with lastResultId
        await setDoc(
          doc(db, 'profiles', user.uid),
          {
            uid: user.uid,
            lastResultId: resultDoc.id,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // 3) Redirect to profile after a short pause so the user sees the plot
        setTimeout(() => {
          router.replace('/profile');
        }, 1200);
      } catch (e) {
        setSaveError(e.message || 'Failed to save results');
      } finally {
        setSaving(false);
      }
    })();
  }, [router.isReady, router.query, showDebug, user, router]);

  useEffect(() => {
    if (economicScore === null || socialScore === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear & axes
    ctx.clearRect(0, 0, 400, 400);
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    // Y axis
    ctx.moveTo(200, 0);
    ctx.lineTo(200, 400);
    // X axis
    ctx.moveTo(0, 200);
    ctx.lineTo(400, 200);
    ctx.stroke();

    // Labels
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('Left', 20, 210);
    ctx.fillText('Right', 360, 210);
    ctx.fillText('Auth', 205, 20);
    ctx.fillText('Lib', 205, 390);

    // Plot point (flip Y so positive social plots upward)
    const x = 200 + economicScore * 20;
    const y = 200 - socialScore * 20;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
  }, [economicScore, socialScore]);

  if (economicScore === null || socialScore === null) {
    return (
      <div className="text-center mt-10">
        <h1 className="text-2xl font-bold mb-4">Your Political Compass</h1>
        <p>Calculating your results…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4 text-center">Your Political Compass</h1>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <canvas ref={canvasRef} width="400" height="400" className="border mx-auto" />

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Economic Score</div>
            <div className="text-lg font-semibold">{economicScore.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Social Score</div>
            <div className="text-lg font-semibold">{socialScore.toFixed(2)}</div>
          </div>
        </div>

        {saving && (
          <p className="mt-4 text-gray-600 text-center">Saving your result…</p>
        )}
        {saveError && (
          <p className="mt-2 text-red-600 text-center">Error: {saveError}</p>
        )}

        {/* Debug panel only if NEXT_PUBLIC_DEBUG=1 */}
        {showDebug && debug && (
          <div className="text-left max-w-xl mx-auto mt-6 p-4 border rounded bg-gray-50">
            <h2 className="font-semibold mb-2">Debug</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{JSON.stringify(debug, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
