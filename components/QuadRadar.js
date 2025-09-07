// components/QuadRadar.js
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * QuadRadar: single canvas showing 4 axes (econ, soc, glob, prog).
 * Values can be any real numbers (negative or positive). We auto-scale
 * using the max absolute value among inputs (min baseline 5).
 *
 * Conventions:
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
  size = 420,
}) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr =
      Math.max(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const W = size,
      H = size;

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
    const radius = Math.min(W, H) * 0.38; // padding

    // Determine scale: max abs among inputs (fallback to 5)
    const maxAbs = Math.max(
      5,
      ...[econ, soc, glob, prog].map((v) => Math.abs(Number(v) || 0))
    );
    const scale = maxAbs;

    // Helpers
    const toPoint = (angleRad, value) => {
      const r =
        (Math.max(-scale, Math.min(scale, value)) / scale) * radius;
      return [cx + Math.cos(angleRad) * r, cy + Math.sin(angleRad) * r];
    };
    const placeText = (angle, r, text) => {
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.textAlign = cos > 0.2 ? "left" : cos < -0.2 ? "right" : "center";
      ctx.textBaseline = sin > 0.2 ? "top" : sin < -0.2 ? "bottom" : "middle";
      ctx.fillText(text, x, y);
    };

    // Axes (radians, clockwise, 0 at +X)
    const axes = [
      { key: "econ",  labelNeg: "Left",        labelPos: "Right",        angle: 0 },                // East
      { key: "soc",   labelNeg: "Libertarian", labelPos: "Authoritarian", angle: Math.PI / 2 },     // South
      { key: "glob",  labelNeg: "Globalist",   labelPos: "Nationalist",   angle: Math.PI },         // West
      { key: "prog",  labelNeg: "Progressive", labelPos: "Conservative",  angle: (3 * Math.PI) / 2} // North
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
      const x = cx + Math.cos(a.angle) * radius;
      const y = cy + Math.sin(a.angle) * radius;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    // Axis labels (avoid overlap: positive outside, negative inside on opposite)
    ctx.fillStyle = "#374151"; // gray-700
    ctx.font = "12px Arial";

    const outerLabelR = radius + 14;   // positive end
    const innerLabelR = radius - 22;   // negative end (pulled inward to avoid collision)

    axes.forEach((a) => {
      // Positive label at axis tip (outside)
      placeText(a.angle, outerLabelR, a.labelPos);

      // Negative label at the opposite end but INSIDE the rim
      const opp = a.angle + Math.PI;
      placeText(opp, innerLabelR, a.labelNeg);
    });

    // Data polygon
    const values = { econ, soc, glob, prog };
    const points = axes.map((a) => {
      const v = Number(values[a.key]) || 0;
      return toPoint(a.angle, v);
    });

    // Fill
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = "rgba(99, 102, 241, 0.15)"; // indigo-500 ~15%
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

    // Center dot + scale legend
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#6b7280"; // gray-500
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
