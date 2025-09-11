// components/QuadRadar.js
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * QuadRadar: 4-axis radar (econ 0°, glob 45°, soc 90°, prog 135°)
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

    ctx.clearRect(0, 0, W, H);

    const vE = Number.isFinite(+econ) ? +econ : 0;
    const vS = Number.isFinite(+soc) ? +soc : 0;
    const vG = Number.isFinite(+glob) ? +glob : 0;
    const vP = Number.isFinite(+prog) ? +prog : 0;

    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.38;

    const maxAbs = Math.max(5, Math.abs(vE), Math.abs(vS), Math.abs(vG), Math.abs(vP));
    const scale = maxAbs;

    const toPoint = (ang, val) => {
      const r = (Math.max(-scale, Math.min(scale, val)) / scale) * radius;
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

    const A0 = 0, A45 = Math.PI/4, A90 = Math.PI/2, A135 = 3*Math.PI/4;

    const axes = [
      { labelNeg: "Left",        labelPos: "Right",        angle: A0,   val: vE },
      { labelNeg: "Globalist",   labelPos: "Nationalist",  angle: A45,  val: vG },
      { labelNeg: "Libertarian", labelPos: "Authoritarian",angle: A90,  val: vS },
      { labelNeg: "Progressive", labelPos: "Conservative", angle: A135, val: vP },
    ];

    // grid
    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
    for (let i=1;i<=5;i++){ const r=(i/5)*radius; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); }

    // axes
    ctx.strokeStyle = "#9ca3af";
    axes.forEach(a=>{
      const [x,y] = [cx + Math.cos(a.angle)*radius, cy + Math.sin(a.angle)*radius];
      const [xo,yo] = [cx - Math.cos(a.angle)*radius, cy - Math.sin(a.angle)*radius];
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(xo,yo); ctx.stroke();
    });

    // labels
    ctx.fillStyle = "#374151"; ctx.font = "12px Arial";
    const outer = radius+14, inner = radius-22;
    axes.forEach(a=>{
      placeText(a.angle, outer, a.labelPos);
      placeText(a.angle+Math.PI, inner, a.labelNeg);
    });

    const points = axes.map(a=>toPoint(a.angle, a.val));

    // fill
    const area = (()=>{ let s=0; for(let i=0;i<points.length;i++){const[x1,y1]=points[i]; const[x2,y2]=points[(i+1)%points.length]; s+=x1*y2-x2*y1;} return Math.abs(s)/2;})();
    if (area>1){ ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); }

    // stroke
    ctx.strokeStyle = stroke; ctx.lineWidth=2;
    ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.stroke();

    // points
    ctx.fillStyle="#ef4444";
    points.forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); });

    // center + scale
    ctx.beginPath(); ctx.arc(cx,cy,2.5,0,Math.PI*2); ctx.fillStyle="#6b7280"; ctx.fill();
    ctx.fillStyle="#6b7280"; ctx.font="11px Arial"; ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(`Scale ±${scale.toFixed(1)}`, cx, cy+radius+28);
  };

  useLayoutEffect(draw,[econ,soc,glob,prog,size,fill,stroke]);
  useEffect(()=>{ const ro=new ResizeObserver(()=>draw()); if(canvasRef.current) ro.observe(canvasRef.current); return()=>ro.disconnect();},[]);

  return <canvas ref={canvasRef} width={size} height={size} className={`border rounded mx-auto ${className}`} aria-label="Four-axis political spectrum radar" />;
}
