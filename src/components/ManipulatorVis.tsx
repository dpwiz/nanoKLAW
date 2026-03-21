import React, { useEffect, useRef, useState } from 'react';
import { SegmentConfig } from '../types';

interface Props {
  segments: SegmentConfig[];
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isVacuum?: boolean;
  angle?: number;
  state?: 'rolling' | 'turning' | 'reversing';
  stateTimer?: number;
  targetAngle?: number;
}

export default function ManipulatorVis({ segments }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const latestSegments = useRef(segments);
  const latestTransform = useRef(transform);
  const latestDimensions = useRef(dimensions);

  useEffect(() => { latestSegments.current = segments; }, [segments]);
  useEffect(() => { latestTransform.current = transform; }, [transform]);
  useEffect(() => { latestDimensions.current = dimensions; }, [dimensions]);

  const ballsRef = useRef<Ball[]>([]);
  const prevArmSegmentsRef = useRef<{x1: number, y1: number, x2: number, y2: number, radius: number}[]>([]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      setTransform(prev => {
        const newScale = Math.max(0.1, Math.min(5, prev.scale * (1 + delta)));
        return { ...prev, scale: newScale };
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // Initialize balls
  useEffect(() => {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
    const initialBalls: Ball[] = [];
    for (let i = 0; i < 30; i++) {
      initialBalls.push({
        x: (Math.random() - 0.5) * 1000,
        y: (Math.random() - 0.5) * 1000,
        vx: 0,
        vy: 0,
        radius: i === 0 ? 30 : 15 + Math.random() * 15,
        color: i === 0 ? '#333333' : colors[Math.floor(Math.random() * colors.length)],
        isVacuum: i === 0,
        angle: i === 0 ? Math.random() * Math.PI * 2 : undefined,
        state: i === 0 ? 'rolling' : undefined,
        stateTimer: i === 0 ? 0 : undefined,
        targetAngle: i === 0 ? 0 : undefined,
      });
    }
    ballsRef.current = initialBalls;
  }, []);

  // Animation & Physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = latestDimensions.current;
      const transform = latestTransform.current;
      const segs = latestSegments.current;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2 + transform.x, height / 2 + transform.y);
      ctx.scale(transform.scale, transform.scale);

      // --- PHYSICS ---
      let currentX = 0;
      let currentY = 0;
      let currentAngle = -Math.PI / 2;
      
      const currentArmSegments: {x1: number, y1: number, x2: number, y2: number, radius: number}[] = [];

      segs.forEach((seg) => {
        const relativeAngleDeg = ((seg.rotation - 64) / 64) * 135;
        const relativeAngleRad = (relativeAngleDeg * Math.PI) / 180;
        currentAngle += relativeAngleRad;
        const length = 40 + (seg.extension / 127) * (120 - 40);
        
        const nextX = currentX + Math.cos(currentAngle) * length;
        const nextY = currentY + Math.sin(currentAngle) * length;
        
        currentArmSegments.push({
          x1: currentX, y1: currentY,
          x2: nextX, y2: nextY,
          radius: 12
        });
        
        currentX = nextX;
        currentY = nextY;
      });

      const effectorX = currentX + Math.cos(currentAngle) * 25;
      const effectorY = currentY + Math.sin(currentAngle) * 25;
      currentArmSegments.push({
        x1: currentX, y1: currentY,
        x2: effectorX, y2: effectorY,
        radius: 20
      });

      const prevArmSegments = prevArmSegmentsRef.current.length > 0 ? prevArmSegmentsRef.current : currentArmSegments;
      prevArmSegmentsRef.current = currentArmSegments;

      const balls = ballsRef.current;
      const bounds = 800;
      const maxEv = 30;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        
        if (b.isVacuum) {
          b.stateTimer = (b.stateTimer || 0) + 1;
          
          let hitWall = false;
          if (b.x < -bounds + b.radius + 5 || b.x > bounds - b.radius - 5 || 
              b.y < -bounds + b.radius + 5 || b.y > bounds - b.radius - 5) {
            hitWall = true;
          }

          if (hitWall && b.state !== 'reversing') {
            b.state = 'reversing';
            b.stateTimer = 0;
            b.targetAngle = (b.angle || 0) + Math.PI + (Math.random() - 0.5) * Math.PI;
          }

          if (b.state === 'reversing') {
            const speed = -2;
            b.vx += (Math.cos(b.angle || 0) * speed - b.vx) * 0.1;
            b.vy += (Math.sin(b.angle || 0) * speed - b.vy) * 0.1;
            
            if (b.stateTimer > 30) {
              b.state = 'turning';
              b.stateTimer = 0;
            }
          } else if (b.state === 'turning') {
            const diff = (b.targetAngle || 0) - (b.angle || 0);
            const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
            
            b.angle = (b.angle || 0) + Math.sign(normalizedDiff) * 0.05;
            
            if (Math.abs(normalizedDiff) < 0.1 || b.stateTimer > 60) {
              b.state = 'rolling';
              b.stateTimer = 0;
            }
          } else {
            if (b.stateTimer > 120 + Math.random() * 60) {
              b.state = 'turning';
              b.stateTimer = 0;
              b.targetAngle = (b.angle || 0) + (Math.random() - 0.5) * Math.PI;
            }
            
            const speed = 3;
            b.vx += (Math.cos(b.angle || 0) * speed - b.vx) * 0.1;
            b.vy += (Math.sin(b.angle || 0) * speed - b.vy) * 0.1;
          }
        }

        b.x += b.vx;
        b.y += b.vy;
        
        // Increased floor friction (was 0.94)
        b.vx *= 0.82; 
        b.vy *= 0.82;

        // Bounds collision (more energy loss on bounce)
        if (b.x < -bounds + b.radius) { b.x = -bounds + b.radius; b.vx *= -0.5; }
        if (b.x > bounds - b.radius) { b.x = bounds - b.radius; b.vx *= -0.5; }
        if (b.y < -bounds + b.radius) { b.y = -bounds + b.radius; b.vy *= -0.5; }
        if (b.y > bounds - b.radius) { b.y = bounds - b.radius; b.vy *= -0.5; }

        // Arm collision (all segments)
        for (let s = 0; s < currentArmSegments.length; s++) {
          const seg = currentArmSegments[s];
          const prevSeg = prevArmSegments[s] || seg;
          
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const len2 = dx * dx + dy * dy;
          
          let t = 0;
          if (len2 > 0) {
            t = ((b.x - seg.x1) * dx + (b.y - seg.y1) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
          }
          
          const closestX = seg.x1 + t * dx;
          const closestY = seg.y1 + t * dy;
          
          const distX = b.x - closestX;
          const distY = b.y - closestY;
          const dist = Math.sqrt(distX * distX + distY * distY);
          const minDist = b.radius + seg.radius;
          
          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            const nx = distX / dist;
            const ny = distY / dist;
            
            b.x += nx * overlap;
            b.y += ny * overlap;
            
            const prevClosestX = prevSeg.x1 + t * (prevSeg.x2 - prevSeg.x1);
            const prevClosestY = prevSeg.y1 + t * (prevSeg.y2 - prevSeg.y1);
            
            const segVx = closestX - prevClosestX;
            const segVy = closestY - prevClosestY;
            
            const clampedEvX = Math.max(-maxEv, Math.min(maxEv, segVx));
            const clampedEvY = Math.max(-maxEv, Math.min(maxEv, segVy));
            
            b.vx += clampedEvX * 0.25 + nx * 1.5;
            b.vy += clampedEvY * 0.25 + ny * 1.5;
          }
        }

        // Ball-ball collision
        for (let j = i + 1; j < balls.length; j++) {
          const b2 = balls[j];
          const dx2 = b2.x - b.x;
          const dy2 = b2.y - b.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          const minDist2 = b.radius + b2.radius;

          if (dist2 < minDist2 && dist2 > 0) {
            const overlap = minDist2 - dist2;
            const nx = dx2 / dist2;
            const ny = dy2 / dist2;
            
            const massRatio1 = b2.radius / (b.radius + b2.radius);
            const massRatio2 = b.radius / (b.radius + b2.radius);
            
            b.x -= nx * overlap * massRatio1;
            b.y -= ny * overlap * massRatio1;
            b2.x += nx * overlap * massRatio2;
            b2.y += ny * overlap * massRatio2;

            const kx = (b.vx - b2.vx);
            const ky = (b.vy - b2.vy);
            const p = 2 * (nx * kx + ny * ky) / (b.radius + b2.radius);
            
            // More inelastic collision (was 0.8, now 0.5)
            b.vx -= p * b2.radius * nx * 0.5;
            b.vy -= p * b2.radius * ny * 0.5;
            b2.vx += p * b.radius * nx * 0.5;
            b2.vy += p * b.radius * ny * 0.5;
          }
        }
      }

      // --- RENDERING ---
      // Draw grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1 / transform.scale;
      const gridSize = 50;
      const gridExtent = 2000;
      
      ctx.beginPath();
      for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
        ctx.moveTo(x, -gridExtent); ctx.lineTo(x, gridExtent);
      }
      for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
        ctx.moveTo(-gridExtent, y); ctx.lineTo(gridExtent, y);
      }
      ctx.stroke();

      // Draw bounds
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 4 / transform.scale;
      ctx.strokeRect(-bounds, -bounds, bounds * 2, bounds * 2);

      // Draw axes
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = 2 / transform.scale;
      ctx.beginPath();
      ctx.moveTo(-gridExtent, 0); ctx.lineTo(gridExtent, 0);
      ctx.moveTo(0, -gridExtent); ctx.lineTo(0, gridExtent);
      ctx.stroke();

      // Draw balls
      balls.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2 / transform.scale;
        ctx.stroke();
        
        if (b.isVacuum) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.7, 0, Math.PI * 2);
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 2 / transform.scale;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x + Math.cos(b.angle || 0) * b.radius, b.y + Math.sin(b.angle || 0) * b.radius);
          ctx.strokeStyle = '#0f0';
          ctx.lineWidth = 3 / transform.scale;
          ctx.stroke();
          
          if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.beginPath();
            ctx.arc(b.x - Math.cos(b.angle || 0) * b.radius * 0.5, b.y - Math.sin(b.angle || 0) * b.radius * 0.5, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#f00';
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fill();
        }
      });

      // Draw manipulator
      currentX = 0;
      currentY = 0;
      currentAngle = -Math.PI / 2;

      // Draw base mount
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-40, -10, 80, 20);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2 / transform.scale;
      ctx.stroke();

      segs.forEach((seg, i) => {
        const relativeAngleDeg = ((seg.rotation - 64) / 64) * 135; 
        const relativeAngleRad = (relativeAngleDeg * Math.PI) / 180;
        
        currentAngle += relativeAngleRad;

        const minLen = 40;
        const maxLen = 120;
        const length = minLen + (seg.extension / 127) * (maxLen - minLen);

        const nextX = currentX + Math.cos(currentAngle) * length;
        const nextY = currentY + Math.sin(currentAngle) * length;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(currentAngle);
        
        // Piston rod
        ctx.fillStyle = '#94a3b8'; 
        ctx.fillRect(0, -5, length, 10);
        
        // Rod texture
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1 / transform.scale;
        for(let r = 30; r < length - 10; r += 10) {
          ctx.beginPath();
          ctx.moveTo(r, -5);
          ctx.lineTo(r, 5);
          ctx.stroke();
        }

        // Cylinder body
        const cylinderLen = 35;
        ctx.fillStyle = '#334155'; 
        ctx.fillRect(0, -12, cylinderLen, 24);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / transform.scale;
        ctx.strokeRect(0, -12, cylinderLen, 24);
        
        // Cylinder accents
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cylinderLen - 10, -14, 10, 28);

        // Joint index label
        ctx.save();
        ctx.translate(cylinderLen / 2, 0);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${10 / transform.scale}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`S${i+1}`, 0, 0);
        ctx.restore();

        ctx.restore();

        // Draw joint pivot
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(nextX, nextY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2 / transform.scale;
        ctx.stroke();
        
        // Inner pin
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(nextX, nextY, 4, 0, Math.PI * 2);
        ctx.fill();

        currentX = nextX;
        currentY = nextY;
      });

      // Draw end effector
      ctx.save();
      ctx.translate(currentX, currentY);
      ctx.rotate(currentAngle);
      
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -15, 15, 30);
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(15, -15);
      ctx.lineTo(35, -15);
      ctx.lineTo(35, -5);
      ctx.lineTo(15, -5);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(15, 5);
      ctx.lineTo(35, 5);
      ctx.lineTo(35, 15);
      ctx.lineTo(15, 15);
      ctx.fill();

      ctx.restore();
      
      ctx.restore(); // restore transform
      ctx.restore(); // restore dpr

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: dimensions.width, height: dimensions.height }}
      />
      
      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl pointer-events-none">
        <h3 className="text-emerald-400 font-mono text-sm mb-2">SYSTEM STATUS</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono text-slate-300">
          <div>JOINTS: 8</div>
          <div>DOF: 16</div>
          <div>SCALE: {transform.scale.toFixed(2)}x</div>
          <div>MODE: MANUAL</div>
        </div>
        <div className="mt-3 text-[10px] text-slate-500">
          Scroll to zoom, drag to pan
        </div>
      </div>
    </div>
  );
}
