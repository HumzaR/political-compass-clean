// components/CompassCanvas.js
import { useEffect, useLayoutEffect, useRef } from "react";

export default function CompassCanvas({ econ, soc, className = "" }) {
  const canvasRef = useRef(null);
  const lastDrawRef = useRef("");

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const W = 400, H = 400;

    // Backing store size + CSS size
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[Compass] 2D context unavailable");
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, W, H);

    // GRID
    ctx.strokeStyle = "#e5e7eb"; // gray-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= W; gx += 40) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    for (let gy = 0; gy <= H; gy += 40) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();

    // AXES
    ctx.strokeStyle = "#374151"; // gray-700
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.stroke();

    // LABELS
    ctx.fillStyle = "#374151";
    ctx.font = "12px Arial";
    ctx.fillText("Left", 10, H / 2 - 8);
    ctx.fillText("Right", W - 40, H / 2 - 8);
    ctx.fillText("Auth", W / 2 + 8, 14);
    ctx.fillText("Lib", W / 2 + 8, H - 8);

    // POINT (only if valid)
    if (Number.isFinite(econ) && Number.isFinite(soc)) {
      const x = W / 2 + econ * 20;
      const y = H / 2 - soc * 20; // up = authoritarian
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      lastDrawRef.current = `point(${econ.toFixed(2)}, ${soc.toFixed(2)})`;
    } else {
      lastDrawRef.current = "axes-only";
    }

    // Small breadcrumb for debugging
    // eslint-disable-next-line no-console
    console.log("[CompassCanvas] draw:", lastDrawRef.current);
  };

  // Draw on mount and when econ/soc change
  useLayoutEffect(draw, [econ, soc]);

  // Redraw on resize (in case DPR/layout changes)
  useEffect(() => {
    const ro = new ResizeObserver(draw);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className={`border mx-auto ${className}`}
      aria-label="Political compass chart"
    />
  );
}
