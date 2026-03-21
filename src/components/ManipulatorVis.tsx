import React, { useEffect, useRef, useState } from 'react';
import { SegmentConfig } from '../types';

interface Props {
  segments: SegmentConfig[];
}

export default function ManipulatorVis({ segments }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    renderManipulator(ctx, dimensions.width, dimensions.height, segments, transform);
  }, [dimensions, segments, transform]);

  const renderManipulator = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    segments: SegmentConfig[],
    transform: { x: number, y: number, scale: number }
  ) => {
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + transform.x, height / 2 + transform.y);
    ctx.scale(transform.scale, transform.scale);

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

    // Draw axes
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 2 / transform.scale;
    ctx.beginPath();
    ctx.moveTo(-gridExtent, 0); ctx.lineTo(gridExtent, 0);
    ctx.moveTo(0, -gridExtent); ctx.lineTo(0, gridExtent);
    ctx.stroke();

    let currentX = 0;
    let currentY = 0;
    let currentAngle = -Math.PI / 2;

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

    segments.forEach((seg, i) => {
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
    ctx.restore();
  };

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
