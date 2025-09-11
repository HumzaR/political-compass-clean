// components/QuadRadar.js
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * QuadRadar: 4-axis radar (econ 0°, glob 45°, soc 90°, prog 135°)
 * - Shows neutral markers on each axis when values are near zero
 * - Draws small score badges per axis
 *
 * Props:
 *  - econ, soc, glob, prog  (numbers; non-finite treated as 0)
 *  - size (px box)
 *  - fill (rgba string), stroke (css color)
 */
export default function QuadRadar({
  econ = 0,
  soc = 0,
  glob = 0,
  prog = 0,
  size = 420,
  fill = "rgba(99,102,241,0.15)",   // indigo-500 @15%
  stroke = "#6366f1",               // indigo-500
  className = "",
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

    // sanitize
    const vE = Number.isFinite(+econ) ? +econ : 0;
    const vS = Number.isFinite(+soc) ? +soc : 0;
    const vG = Number.isFinite(+glob) ? +glob : 0;
    const vP = Number.isFinite(+prog) ? +prog : 0;

    // dims
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.38;

    // scale
    const maxAbs = Math.max(5, Math.abs(vE), Math.abs(vS), Math.abs(vG), Math.abs(vP));
    const scale = maxAbs;

    // helpers
    const toPoint = (ang, val) => {
      const clamped = Math.max(-scale, Math.min(scale, val));
      const r = (clamped / scale) * radius;
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    };
    const placeText = (ang, r, text) => {
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      ctx.textAlign = cos > 0.2 ? "left" : cos < -0.2 ? "right" : "center";
      ctx.textBaseline = sin > 0.2 ? "top" : sin < -0.2 ? "bottom" : "middle";
      ctx.fillText(text, x, y);
    };

    // angles
    const A0 = 0, A45 = Math.PI/4, A90 = Math.PI/2, A135 = 3*Math.PI/4;

    const axes = [
      { key: "econ",  labelNeg: "Left",        labelPos: "Right",        angle: A0,   val: vE,  short: "Econ" },
      { key: "glob",  labelNeg: "Globalist",   labelPos: "Nationalist",  angle: A45,  val: vG,  short: "Glob" },
      { key: "soc",   labelNeg: "Libertarian", labelPos: "Authoritarian",angle: A90,  val: vS,  short: "Social" },
      { key: "prog",  labelNeg: "Progressive", labelPos: "Conservative", angle: A135, val: vP,  short: "Prog" },
    ];

    // grid rings
    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const r = (i / 5) * radius;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }

    // axis lines (both directions)
    ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 1;
    axes.forEach(a => {
      const [x, y] = [cx + Math.cos(a.angle) * radius, cy + Math.sin(a.angle) * radius];
      const [xo, yo] = [cx - Math.cos(a.angle) * radius, cy - Math.sin(a.angle) * radius];
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(xo, yo); ctx.stroke();
    });

    // labels (positive outside, negative inside opposite)
    ctx.fillStyle = "#374151"; ctx.font = "12px Arial";
    const outer = radius + 14, inner = radius - 22;
    axes.forEach(a => {
      placeText(a.angle, outer, a.labelPos);
      placeText(a.angle + Math.PI, inner, a.labelNeg);
    });

    // data points
    const points = axes.map(a => toPoint(a.angle, a.val));

    // fill polygon only if area visible
    const area = (() => {
      let s = 0;
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        s += x1 * y2 - x2 * y1;
      }
      return Math.abs(s) / 2;
    })();

    if (area > 1) {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }

    // outline
    ctx.strokeStyle = stroke; ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();

    // axis value markers
    ctx.fillStyle = "#ef4444"; // red-500
    points.forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    });

    // neutral markers when |val| is tiny
    const nearZeroThresh = scale * 0.02;            // 2% of scale considered "neutral"
    const neutralR = Math.min(10, radius * 0.12);   // small stub distance from center
    ctx.fillStyle = "#9ca3af"; // gray-400
    axes.forEach(a => {
      if (Math.abs(a.val) <= nearZeroThresh) {
        const [nx, ny] = [cx + Math.cos(a.angle) * neutralR, cy + Math.sin(a.angle) * neutralR];
        ctx.beginPath(); ctx.arc(nx, ny, 3, 0, Math.PI * 2); ctx.fill();
      }
    });

    // center + scale
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fillStyle = "#6b7280"; ctx.fill();
    ctx.fillStyle = "#6b7280"; ctx.font = "11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(`Scale ±${scale.toFixed(1)}`, cx, cy + radius + 28);

    // per-axis score badges
    ctx.font = "11px Arial"; ctx.fillStyle = "#374151";
    axes.forEach(a => {
      const badgeR = radius * 0.72;
      const x = cx + Math.cos(a.angle) * badgeR;
      const y = cy + Math.sin(a.angle) * badgeR;
      const txt = `${a.short}: ${Number(a.val).toFixed(2)}`;
      // text anchor
      const cos = Math.cos(a.angle), sin = Math.sin(a.angle);
      ctx.textAlign = cos > 0.2 ? "left" : cos < -0.2 ? "right" : "center";
      ctx.textBaseline = sin > 0.2 ? "top" : sin < -0.2 ? "bottom" : "middle";
      ctx.fillText(txt, x, y);
    });
  };

  useLayoutEffect(draw, [econ, soc, glob, prog, size, fill, stroke]);
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
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
