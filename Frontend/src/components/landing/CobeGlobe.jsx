import React, { useEffect, useRef } from 'react';

// ─── Colorful 3D Globe using Canvas 2D ────────────────────────────────────────
// No WebGL / Three.js — pure Canvas 2D for maximum compatibility

const CobeGlobe = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const rotationRef = useRef(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const velocityRef = useRef(0.003);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const SIZE = 520;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const R = SIZE * 0.44; // globe radius

    // ── Continent data as lat/lon polygons ────────────────────────────────────
    const continents = [
      {
        name: 'north_america',
        color: '#22c55e',
        stroke: '#73A5CA',
        pts: [
          [71,-165],[71,-130],[68,-95],[60,-75],[54,-55],[47,-53],[44,-65],
          [30,-81],[25,-80],[22,-97],[16,-93],[8,-78],[15,-84],[18,-104],
          [29,-114],[34,-120],[48,-125],[58,-136],[64,-166],[66,-168]
        ]
      },
      {
        name: 'south_america',
        color: '#16a34a',
        stroke: '#FFC81E',
        pts: [
          [12,-73],[10,-61],[5,-52],[-3,-37],[-8,-35],[-23,-42],[-34,-53],
          [-54,-67],[-55,-73],[-42,-73],[-18,-70],[-5,-81],[5,-77]
        ]
      },
      {
        name: 'europe',
        color: '#34d399',
        stroke: '#73A5CA',
        pts: [
          [71,28],[65,30],[60,40],[54,38],[45,35],[37,26],[36,-5],
          [43,-9],[48,-4],[54,9],[58,6],[62,5],[68,14],[70,20]
        ]
      },
      {
        name: 'africa',
        color: '#eab308',
        stroke: '#E87F24',
        pts: [
          [37,10],[32,32],[22,37],[12,51],[5,48],[-4,39],[-15,40],
          [-26,33],[-34,19],[-34,18],[-22,14],[-12,13],[5,2],[5,-4],
          [15,-17],[28,-13],[35,-1]
        ]
      },
      {
        name: 'asia',
        color: '#10b981',
        stroke: '#FFC81E',
        pts: [
          [75,40],[72,80],[70,130],[70,170],[60,160],[50,140],[40,125],
          [30,121],[22,114],[10,107],[2,104],[13,100],[22,89],[15,80],
          [8,77],[22,69],[25,60],[29,48],[40,47],[42,30],[50,40],[55,60],[65,75]
        ]
      },
      {
        name: 'india',
        color: '#f59e0b',
        stroke: '#FFC81E',
        pts: [[33,75],[26,88],[20,85],[8,77],[22,69],[30,70]]
      },
      {
        name: 'australia',
        color: '#f59e0b',
        stroke: '#E87F24',
        pts: [
          [-11,142],[-14,136],[-12,131],[-21,114],[-32,115],[-35,118],
          [-35,150],[-28,153],[-19,146]
        ]
      },
      {
        name: 'greenland',
        color: '#86efac',
        stroke: '#73A5CA',
        pts: [[83,-35],[76,-18],[70,-22],[66,-34],[68,-52],[72,-55],[78,-72],[82,-60]]
      },
    ];

    // ── City dots ─────────────────────────────────────────────────────────────
    const cities = [
      { lat: 40.71, lon: -74.01, color: '#FFC81E', label: 'NY' },
      { lat: 51.51, lon: -0.13,  color: '#73A5CA', label: 'London' },
      { lat: 35.68, lon: 139.65, color: '#E87F24', label: 'Tokyo' },
      { lat: 28.61, lon: 77.21,  color: '#FFC81E', label: 'Delhi' },
      { lat: 1.35,  lon: 103.82, color: '#E87F24', label: 'Singapore' },
      { lat: -33.87,lon: 151.21, color: '#73A5CA', label: 'Sydney' },
      { lat: -23.55,lon: -46.63, color: '#FFC81E', label: 'São Paulo' },
      { lat: 25.20, lon: 55.27,  color: '#E87F24', label: 'Dubai' },
      { lat: 48.85, lon: 2.35,   color: '#FFC81E', label: 'Paris' },
      { lat: 37.78, lon: -122.44,color: '#73A5CA', label: 'SF' },
    ];

    // ── Flight arc connections ────────────────────────────────────────────────
    const arcs = [
      [0,1],[1,3],[3,4],[4,2],[2,9],[9,0],[0,6],[1,7],[7,3],[4,5],[8,1]
    ];

    // ── Helpers ───────────────────────────────────────────────────────────────
    const toRad = (d) => d * Math.PI / 180;

    // Convert lat/lon + current rotation to 2D canvas x,y and visibility
    const project = (lat, lon, rotY) => {
      const phi = toRad(90 - lat);
      const theta = toRad(lon + rotY);
      const x3 = R * Math.sin(phi) * Math.cos(theta);
      const y3 = R * Math.cos(phi);
      const z3 = R * Math.sin(phi) * Math.sin(theta);
      return {
        x: cx + x3,
        y: cy - y3,
        z: z3,
        visible: z3 >= -R * 0.15,
      };
    };

    // Draw a polygon given lat/lon array
    const drawPolygon = (pts, fillColor, strokeColor, rotY) => {
      const projected = pts.map(([lat, lon]) => project(lat, lon, rotY));
      // Only draw if most points are visible
      const visCount = projected.filter(p => p.visible).length;
      if (visCount < pts.length * 0.3) return;

      ctx.beginPath();
      let started = false;
      projected.forEach((p) => {
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();

      // Depth-based alpha for 3D feel
      const avgZ = projected.reduce((s, p) => s + p.z, 0) / projected.length;
      const alpha = 0.6 + 0.4 * ((avgZ + R) / (2 * R));
      ctx.globalAlpha = Math.max(0.3, Math.min(1, alpha));
      ctx.fillStyle = fillColor;
      ctx.fill();
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    // Draw a 3D great-circle arc
    const drawArc = (c1, c2, rotY, t) => {
      const p1 = project(c1.lat, c1.lon, rotY);
      const p2 = project(c2.lat, c2.lon, rotY);
      if (!p1.visible || !p2.visible) return;

      // Animated dash offset
      const steps = 40;
      const progress = ((t * 0.5) % 1);
      const startI = Math.floor(progress * steps);

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const lat = c1.lat * (1 - f) + c2.lat * f;
        const lon = c1.lon * (1 - f) + c2.lon * f;
        const p = project(lat, lon, rotY);
        if (!p.visible) continue;
        // Lift arc off surface
        const lift = Math.sin(f * Math.PI) * 0.08;
        const scale = 1 + lift;
        const px = cx + (p.x - cx) * scale;
        const py = cy + (p.y - cy) * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.strokeStyle = '#FFC81E';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -(t * 30) % 20;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    };

    // ── Main draw function ────────────────────────────────────────────────────
    let startTime = Date.now();

    const draw = () => {
      const t = (Date.now() - startTime) / 1000;
      const rotY = rotationRef.current * (180 / Math.PI);

      ctx.clearRect(0, 0, SIZE, SIZE);

      // 1. Deep space background glow
      const spaceBg = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.6);
      spaceBg.addColorStop(0, 'rgba(232,127,36,0.08)');
      spaceBg.addColorStop(0.5, 'rgba(255,200,30,0.04)');
      spaceBg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spaceBg;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // 2. Ocean base sphere
      const oceanGrad = ctx.createRadialGradient(cx - R*0.3, cy - R*0.3, R*0.1, cx, cy, R);
      oceanGrad.addColorStop(0, '#1a6fa8');
      oceanGrad.addColorStop(0.4, '#0d4a7a');
      oceanGrad.addColorStop(0.8, '#072d4f');
      oceanGrad.addColorStop(1, '#041a30');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // 3. Latitude/longitude grid lines
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#73A5CA';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 5) {
          const p = project(lat, lon, rotY);
          if (!p.visible) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -85; lat <= 85; lat += 5) {
          const p = project(lat, lon, rotY);
          if (!p.visible) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 4. Continents
      continents.forEach(({ pts, color, stroke }) => {
        drawPolygon(pts, color, stroke, rotY);
      });

      // 5. Flight arcs (animated)
      arcs.forEach(([i, j]) => {
        if (i < cities.length && j < cities.length) {
          drawArc(cities[i], cities[j], rotY, t);
        }
      });

      // 6. City dots with pulsing rings
      cities.forEach((city, idx) => {
        const p = project(city.lat, city.lon, rotY);
        if (!p.visible) return;

        // Pulsing ring
        const pulse = ((t * 1.2 + idx * 0.35) % 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + pulse * 14, 0, Math.PI * 2);
        ctx.strokeStyle = city.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = (1 - pulse) * 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // City dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = city.color;
        ctx.shadowColor = city.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 7. Specular highlight (shiny reflection)
      const specGrad = ctx.createRadialGradient(
        cx - R * 0.38, cy - R * 0.38, 0,
        cx - R * 0.38, cy - R * 0.38, R * 0.65
      );
      specGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
      specGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
      specGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();

      // 8. Atmospheric rim glow (Fresnel-style)
      const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.18);
      rimGrad.addColorStop(0, 'rgba(115,165,202,0)');
      rimGrad.addColorStop(0.6, 'rgba(255,200,30,0.18)');
      rimGrad.addColorStop(0.85, 'rgba(232,127,36,0.28)');
      rimGrad.addColorStop(1, 'rgba(232,127,36,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // 9. Globe border clip (sharp edge)
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,200,30,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 10. Orbiting ring (CSS-animated satellite ring)
      const ringAngle = t * 0.7;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ringAngle);
      ctx.scale(1, 0.28); // flatten into ellipse
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.38, 0, Math.PI * 2);
      ctx.strokeStyle = '#E87F24';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Auto-rotation
      if (!isDragging.current) {
        rotationRef.current += velocityRef.current;
      }
      // Inertia decay
      if (!isDragging.current && Math.abs(velocityRef.current) > 0.003) {
        velocityRef.current *= 0.97;
        if (Math.abs(velocityRef.current) < 0.003) velocityRef.current = 0.003;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    // ── Mouse/touch drag interaction ─────────────────────────────────────────
    const onDown = (e) => {
      isDragging.current = true;
      lastX.current = e.clientX ?? e.touches?.[0]?.clientX;
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
      if (!isDragging.current) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const dx = x - lastX.current;
      lastX.current = x;
      rotationRef.current += dx * 0.003;
      velocityRef.current = dx * 0.003;
    };
    const onUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  return (
    <div
      style={{
        width: 520,
        height: 520,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 0 40px rgba(232,127,36,0.35)) drop-shadow(0 0 80px rgba(255,200,30,0.15))',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          cursor: 'grab',
          borderRadius: '50%',
          display: 'block',
        }}
      />
    </div>
  );
};

export default CobeGlobe;
