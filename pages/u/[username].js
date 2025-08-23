// pages/u/[username].js
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

export default function PublicProfile() {
  const router = useRouter();
  const { username } = router.query;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        // Find profile by username
        const q = query(collection(db, "profiles"), where("username", "==", String(username)));
        const qs = await getDocs(q);
        if (qs.empty) {
          setNotFound(true);
          return;
        }
        const profDoc = qs.docs[0];
        const profData = { id: profDoc.id, ...profDoc.data() };
        setProfile(profData);

        if (!profData.lastResultId) {
          // profile exists but no results yet
          setResult(null);
          return;
        }

        const resSnap = await getDoc(doc(db, "results", profData.lastResultId));
        if (resSnap.exists()) {
          setResult(resSnap.data());
        } else {
          setResult(null);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [username]);

  // Draw compass if we have a result
  useEffect(() => {
    if (!result) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const economicScore = result.economicScore ?? 0;
    const socialScore = result.socialScore ?? 0;

    // Clear & axes
    ctx.clearRect(0, 0, 400, 400);
    ctx.strokeStyle = "#ccc";
    ctx.beginPath();
    ctx.moveTo(200, 0);
    ctx.lineTo(200, 400);
    ctx.moveTo(0, 200);
    ctx.lineTo(400, 200);
    ctx.stroke();

    ctx.font = "12px Arial";
    ctx.fillStyle = "#666";
    ctx.fillText("Left", 20, 210);
    ctx.fillText("Right", 360, 210);
    ctx.fillText("Auth", 205, 20);
    ctx.fillText("Lib", 205, 390);

    // Flip Y so positive social plots upward
    const x = 200 + economicScore * 20;
    const y = 200 - socialScore * 20;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  }, [result]);

  if (loading) {
    return <p className="text-center mt-10">Loading profile…</p>;
  }

  if (notFound || !profile) {
    return <p className="text-center mt-10">Profile not found.</p>;
  }

  const {
    displayName = "",
    country = "",
    city = "",
    age = "",
    ethnicity = "", // optional
    gender = "",
  } = profile;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2 text-center">@{profile.username}</h1>
      {displayName && (
        <p className="text-center text-gray-700 mb-6">{displayName}</p>
      )}

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {country && (
            <div>
              <div className="text-sm text-gray-500">Country</div>
              <div className="font-medium">{country}</div>
            </div>
          )}
          {city && (
            <div>
              <div className="text-sm text-gray-500">City</div>
              <div className="font-medium">{city}</div>
            </div>
          )}
          {age && (
            <div>
              <div className="text-sm text-gray-500">Age</div>
              <div className="font-medium">{age}</div>
            </div>
          )}
          {gender && (
            <div>
              <div className="text-sm text-gray-500">Gender</div>
              <div className="font-medium">{gender}</div>
            </div>
          )}
          {ethnicity && (
            <div>
              <div className="text-sm text-gray-500">Ethnicity</div>
              <div className="font-medium">{ethnicity}</div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Latest Quiz Result</h2>
          {!result ? (
            <p className="text-gray-600">No quiz result yet.</p>
          ) : (
            <>
              <canvas ref={canvasRef} width="400" height="400" className="border mx-auto" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500">Economic Score</div>
                  <div className="text-lg font-semibold">
                    {Number(result.economicScore).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Social Score</div>
                  <div className="text-lg font-semibold">
                    {Number(result.socialScore).toFixed(2)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
