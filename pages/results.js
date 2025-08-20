import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import questions from '../data/questions';

export default function Results() {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [economicScore, setEconomicScore] = useState(null);
  const [socialScore, setSocialScore] = useState(null);
  const [debug, setDebug] = useState(null);

  useEffect(() => {
    // Ensure the query is available (Next.js quirk)
    if (!router.isReady) return;

    const answersStr = router.query.answers || '';
    const answerArray = answersStr ? answersStr.split(',').map(Number) : [];

    // Map answers to question IDs (by index order)
    const userAnswers = {};
    questions.forEach((q, i) => {
      userAnswers[q.id] = answerArray[i];
    });

    // Compute scores
    let econ = 0;
    let soc = 0;

    questions.forEach((q) => {
      const response = userAnswers[q.id];
      // response can be 0 (valid for yes/no), so only skip if undefined/NaN
      if (response === undefined || Number.isNaN(response)) return;

      // Center 1–5 around 3; multiply by weight and direction
      const scaled = (response - 3) * (q.weight ?? 1) * (q.direction ?? 1);

      if (q.axis === 'economic') {
        econ += scaled;
      } else if (q.axis === 'social') {
        soc += scaled;
      }
    });

    setEconomicScore(econ);
    setSocialScore(soc);

    setDebug({
      isReady: router.isReady,
      answersStr,
      answerArray,
      mappedAnswers: userAnswers,
      econ,
      soc,
      questionCount: questions.length,
    });
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (economicScore === null || socialScore === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear & grid
    ctx.clearRect(0, 0, 400, 400);
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(200, 0);   ctx.lineTo(200, 400); // Y axis
    ctx.moveTo(0, 200);   ctx.lineTo(400, 200); // X axis
    ctx.stroke();

    // Labels
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('Left', 20, 210);
    ctx.fillText('Right', 360, 210);
    ctx.fillText('Auth', 205, 20);
    ctx.fillText('Lib', 205, 390);

    // Point (tweak 20 -> different scale if needed)
    const x = 200 + economicScore * 20;
    const y = 200 + socialScore * 20;

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
    <div className="text-center mt-10">
      <h1 className="text-2xl font-bold mb-4">Your Political Compass</h1>
      <canvas ref={canvasRef} width="400" height="400" className="border mx-auto" />
      <p className="mt-4"><strong>Economic Score:</strong> {economicScore.toFixed(2)}</p>
      <p><strong>Social Score:</strong> {socialScore.toFixed(2)}</p>

      {/* Debug panel – remove when happy */}
      {debug && (
        <div className="text-left max-w-xl mx-auto mt-6 p-4 border rounded bg-gray-50">
          <h2 className="font-semibold mb-2">Debug</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
