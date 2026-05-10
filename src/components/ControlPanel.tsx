import React, { useEffect } from 'react';
import { SegmentConfig } from '../types';
import { RotateCcw, Maximize2, Grip, RefreshCw } from 'lucide-react';

interface Props {
  segments: SegmentConfig[];
  gripper: { rotation: number; extension: number };
  onChange: (id: number, field: keyof SegmentConfig, value: number) => void;
  onGripperChange: (field: 'rotation' | 'extension', value: number) => void;
  segmentTitlePrefix: string;
  baseCc: number;
  flipped: boolean;
  onReset: () => void;
}

export default function ControlPanel({ 
  segments, gripper, 
  onChange, onGripperChange, 
  segmentTitlePrefix, baseCc, flipped, onReset
}: Props) {

  const getCcId = (idx: number) => flipped ? baseCc + (3 - idx) : baseCc + idx;
  const armKey = baseCc === 0 ? 'arm1' : 'arm2';

  useEffect(() => {
    const handlePhysicalUpdate = ((e: CustomEvent) => {
      const armPhysical = e.detail[armKey];
      if (!armPhysical) return;

      armPhysical.segments.forEach((seg: any, idx: number) => {
        const rotTick = document.getElementById(`tick-${armKey}-seg${idx}-rot`);
        if (rotTick) {
          rotTick.style.left = `calc(0.5rem + ${(seg.rotation / 127) * 100}% - ${(seg.rotation / 127)} * 1rem)`;
        }
        const extTick = document.getElementById(`tick-${armKey}-seg${idx}-ext`);
        if (extTick) {
          extTick.style.left = `calc(0.5rem + ${(seg.extension / 127) * 100}% - ${(seg.extension / 127)} * 1rem)`;
        }
      });

      const gripRotTick = document.getElementById(`tick-${armKey}-grip-rot`);
      if (gripRotTick) {
        gripRotTick.style.left = `calc(0.5rem + ${(armPhysical.gripper.rotation / 127) * 100}% - ${(armPhysical.gripper.rotation / 127)} * 1rem)`;
      }
      const gripExtTick = document.getElementById(`tick-${armKey}-grip-ext`);
      if (gripExtTick) {
        gripExtTick.style.left = `calc(0.5rem + ${(armPhysical.gripper.extension / 127) * 100}% - ${(armPhysical.gripper.extension / 127)} * 1rem)`;
      }
    }) as EventListener;

    window.addEventListener('physical-arm-update', handlePhysicalUpdate);
    return () => window.removeEventListener('physical-arm-update', handlePhysicalUpdate);
  }, [armKey]);

  const renderSegmentControls = (
    segments: SegmentConfig[], 
    onChange: (id: number, field: keyof SegmentConfig, value: number) => void,
    titlePrefix: string
  ) => {
    return segments.map((seg, idx) => (
      <div key={seg.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
        <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex justify-between">
          <span>{titlePrefix} {idx + 1}</span>
          <span className="text-slate-500 font-mono">ID: {getCcId(idx)}</span>
        </div>
        
        <div className="space-y-4">
          {/* Rotation */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-slate-400">
              <span className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-emerald-500" /> Rotation</span>
              <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">{Math.round(seg.rotation)}</span>
            </div>
            <div className="relative">
              <input 
                type="range" 
                min="0" 
                max="127" 
                value={seg.rotation}
                onChange={(e) => onChange(seg.id, 'rotation', parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer relative z-10"
              />
              <div 
                id={`tick-${armKey}-seg${idx}-rot`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-white rounded-full z-20 pointer-events-none"
                style={{ left: `calc(0.5rem + ${(seg.rotation / 127) * 100}% - ${(seg.rotation / 127)} * 1rem)` }}
              ></div>
            </div>
          </div>

          {/* Extension */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-slate-400">
              <span className="flex items-center gap-1.5"><Maximize2 className="w-3.5 h-3.5 text-blue-500" /> Extension</span>
              <span className="font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{Math.round(seg.extension)}</span>
            </div>
            <div className="relative">
              <input 
                type="range" 
                min="0" 
                max="127" 
                value={seg.extension}
                onChange={(e) => onChange(seg.id, 'extension', parseInt(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer relative z-10"
              />
              <div 
                id={`tick-${armKey}-seg${idx}-ext`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-white rounded-full z-20 pointer-events-none"
                style={{ left: `calc(0.5rem + ${(seg.extension / 127) * 100}% - ${(seg.extension / 127)} * 1rem)` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  const renderGripperControl = (
    gripper: { rotation: number; extension: number },
    onChange: (field: 'rotation' | 'extension', value: number) => void,
    title: string
  ) => {
    return (
      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/50 hover:border-slate-500/50 transition-colors">
        <div className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex justify-between">
          <span className="flex items-center gap-1.5"><Grip className="w-4 h-4 text-rose-500" /> {title}</span>
          <span className="text-slate-500 font-mono">ID: {getCcId(3)}</span>
        </div>
        
        <div className="space-y-4">
          {/* Gripper Rotation */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-slate-400">
              <span className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-emerald-500" /> Rotation</span>
              <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">{Math.round(gripper.rotation)}</span>
            </div>
            <div className="relative">
              <input 
                type="range" 
                min="0" 
                max="127" 
                value={gripper.rotation}
                onChange={(e) => onChange('rotation', parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer relative z-10"
              />
              <div 
                id={`tick-${armKey}-grip-rot`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-white rounded-full z-20 pointer-events-none"
                style={{ left: `calc(0.5rem + ${(gripper.rotation / 127) * 100}% - ${(gripper.rotation / 127)} * 1rem)` }}
              ></div>
            </div>
          </div>

          {/* Gripper Open/Close (Extension) */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-slate-400">
              <span className="flex items-center gap-1.5"><Maximize2 className="w-3.5 h-3.5 text-rose-500" /> Open/Close</span>
              <span className="font-mono text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded">{Math.round(gripper.extension)}</span>
            </div>
            <div className="relative">
              <input 
                type="range" 
                min="0" 
                max="127" 
                value={gripper.extension}
                onChange={(e) => onChange('extension', parseInt(e.target.value))}
                className="w-full accent-rose-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer relative z-10"
              />
              <div 
                id={`tick-${armKey}-grip-ext`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-white rounded-full z-20 pointer-events-none"
                style={{ left: `calc(0.5rem + ${(gripper.extension / 127) * 100}% - ${(gripper.extension / 127)} * 1rem)` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      <button 
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-slate-700 mb-2"
      >
        <RefreshCw className="w-3 h-3" /> Reset {segmentTitlePrefix.split(' ')[0]}
      </button>
      {renderSegmentControls(segments, onChange, segmentTitlePrefix)}
      {renderGripperControl(gripper, onGripperChange, `${segmentTitlePrefix} Gripper`)}
    </div>
  );
}
