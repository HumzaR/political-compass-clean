// components/QuadRadar.js
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * QuadRadar: single canvas showing 4 axes (econ, soc, glob, prog).
 * Values can be any real numbers (negative or positive). We auto-scale
 * using the max absolute value among inputs (min baseline 5).
 *
 * Conventions (matching your scoring):
 * - econ:   − = Left,        + = Right
 * - soc:    − = Libertarian, + = Authoritarian
 * - glob:   − = Globalist,   + = Nationalist
 * - prog:   − = Progressive, + = Conservative
 */
export default function QuadRadar({
  econ = 0,
  soc = 0,
  glob = 0,
  prog = 0,
  className = "",
  size = 420, // CSS pixel box (canvas scales internally for Hi-DPI)
}) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const W = size, H = size;

    // back buffer
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // clear
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * 0.38; // padding around

    // Determine scale: max abs among inputs (fallback to 5)
    const maxAbs = Math.max(5, ...[econ, soc, glob, prog].map((v) => Math.abs(Number(v) || 0)));
    const scale = maxAbs;

    // Helpers
    const toPoint = (angleRad, value) => {
      // map value ∈ [-scale, +scale] → [-radius, +radius]
      const r = (Math.max(-scale, Math.min(scale, value)) / scale) * radius;
      return [cx + Math.cos(angleRad) * r, cy + Math.sin(angleRad) * r];
    };

    // Axes (in radians, clockwise, starting at 0° = to the right)
    const axes = [
      { key: "econ",  labelNeg: "Left",        labelPos: "Right",        angle: 0 },                // 0° (east)
      { key: "soc",   labelNeg: "Libertarian", labelPos: "Authoritarian", angle: Math.PI / 2 },     // 90° (south)
      { key: "glob",  labelNeg: "Globalist",   labelPos: "Nationalist",   angle: Math.PI },         // 180° (west)
      { key: "prog",  labelNeg: "Progressive", labelPos: "Conservative",  angle: (3 * Math.PI) / 2 } // 270° (north)
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
    });

    // Axis labels
    ctx.fillStyle = "#374151"; // gray-700
    ctx.font = "12px Arial";
    axes.forEach((a) => {
      // Positive end label
      const [xPos, yPos] = [cx + Math.cos(a.angle) * (radius + 12), cy + Math.sin(a.angle) * (radius + 12)];
      ctx.textAlign = Math.cos(a.angle) > 0.2 ? "left" : Math.cos(a.angle) < -0.2 ? "right" : "center";
      ctx.textBaseline = Math.sin(a.angle) > 0.2 ? "top" : Math.sin(a.angle) < -0.2 ? "bottom" : "middle";
      ctx.fillText(a.labelPos, xPos, yPos);

      // Negative end label (opposite side)
      const opp = a.angle + Math.PI;
      const [xNeg, yNeg] = [cx + Math.cos(opp) * (radius + 12), cy + Math.sin(opp) * (radius + 12)];
      ctx.textAlign = Math.cos(opp) > 0.2 ? "left" : Math.cos(opp) < -0.2 ? "right" : "center";
      ctx.textBaseline = Math.sin(opp) > 0.2 ? "top" : Math.sin(opp) < -0.2 ? "bottom" : "middle";
      ctx.fillText(a.labelNeg, xNeg, yNeg);
    });

    // Plot polygon
    const values = { econ, soc, glob, prog };
    const points = axes.map((a) => {
      const v = Number(values[a.key]) || 0;
      return toPoint(a.angle, v);
    });

    // Fill
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(99, 102, 241, 0.15)"; // indigo-500 @ ~15%
    ctx.fill();

    // Stroke
    ctx.strokeStyle = "#6366f1"; // indigo-500
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Points
    ctx.fillStyle = "#ef4444"; // red-500
    points.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Center dot + scale legend
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#6b7280"; // gray-500
    ctx.fill();

    // Scale annotation
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
