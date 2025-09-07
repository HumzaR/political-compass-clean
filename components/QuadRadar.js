// components/QuadRadar.js
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * QuadRadar: 4-axis radar for econ, soc, glob, prog.
 * Axes are now distinct:
 *   - econ:   0°   (→ Right / ← Left)
 *   - glob:  45°   (↗ Nationalist / ↙ Globalist)
 *   - soc:   90°   (↓ Authoritarian / ↑ Libertarian)
 *   - prog: 135°   (↖ Conservative / ↘ Progressive)
 */
export default function QuadRadar({
  econ = 0,
  soc = 0,
  glob = 0,
  prog = 0,
  className = "",
  size = 420,
}) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const W = size, H = size;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.38;

    // Scale by max abs (fallback 5)
    const maxAbs = Math.max(5, ...[econ, soc, glob, prog].map((v) => Math.abs(Number(v) || 0)));
    const scale = maxAbs;

    // Helpers
    const toPoint = (angleRad, value) => {
      const r = (Math.max(-scale, Math.min(scale, Number(value) || 0)) / scale) * radius;
      return [cx + Math.cos(angleRad) * r, cy + Math.sin(angleRad) * r];
    };
    const placeText = (angle, r, text) => {
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      ctx.textAlign = cos > 0.2 ? "left" : cos < -0.2 ? "right" : "center";
      ctx.textBaseline = sin > 0.2 ? "top" : sin < -0.2 ? "bottom" : "middle";
      ctx.fillText(text, x, y);
    };

    // DISTINCT axis angles (radians)
    const A0   = 0;                 // 0°
    const A45  = Math.PI / 4;       // 45°
    const A90  = Math.PI / 2;       // 90°
    const A135 = (3 * Math.PI) / 4; // 135°

    const axes = [
      { key: "econ",  labelNeg: "Left",        labelPos: "Right",        angle: A0   },
      { key: "glob",  labelNeg: "Globalist",   labelPos: "Nationalist",  angle: A45  },
      { key: "soc",   labelNeg: "Libertarian", labelPos: "Authoritarian",angle: A90  },
      { key: "prog",  labelNeg: "Progressive", labelPos: "Conservative", angle: A135 },
    ];

    // Grid rings
    ctx.strokeStyle = "#e5e7eb"; // gray-200
    ctx.lineWidth = 1;
    const rings = 5;
    for (let i = 1; i <= rings; i++) {
      const r = (i / rings) * radius;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Axis lines
    ctx.strokeStyle = "#9ca3af"; // gray-400
    ctx.lineWidth = 1;
    axes.forEach((a) => {
      const [x, y] = [cx + Math.cos(a.angle) * radius, cy + Math.sin(a.angle) * radius];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Opposite line (for visual symmetry)
      const opp = a.angle + Math.PI;
      const [xo, yo] = [cx + Math.cos(opp) * radius, cy + Math.sin(opp) * radius];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(xo, yo);
      ctx.stroke();
    });

    // Labels (positive outside, negative inside at opposite)
    ctx.fillStyle = "#374151"; // gray-700
    ctx.font = "12px Arial";
    const outerR = radius + 14;
    const innerR = radius - 22;

    axes.forEach((a) => {
      // positive at axis angle
      placeText(a.angle, outerR, a.labelPos);
      // negative at opposite angle, pulled inward
      const opp = a.angle + Math.PI;
      placeText(opp, innerR, a.labelNeg);
    });

    // Data polygon
    const values = { econ, soc, glob, prog };
    const points = axes.map((a) => toPoint(a.angle, values[a.key]));

    // Fill
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = "rgba(99, 102, 241, 0.15)"; // indigo-500 @15%
    ctx.fill();

    // Stroke
    ctx.strokeStyle = "#6366f1"; // indigo-500
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();

    // Points
    ctx.fillStyle = "#ef4444"; // red-500
    points.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Center + scale
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#6b7280";
    ctx.fill();

    ctx.fillStyle = "#6b7280";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`Scale ±${scale.toFixed(1)}`, cx, cy + radius + 28);
  };

  useLayoutEffect(draw, [econ, soc, glob, prog, size]);
  useEffect(() => {
    const ro = new ResizeObserver(draw);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`border rounded mx-auto ${className}`}
      aria-label="Four-axis political spectrum radar"
    />
  );
}
