import React from 'react';
import { SegmentConfig } from '../types';
import { RotateCcw, Maximize2, RefreshCw, Shuffle } from 'lucide-react';

interface Props {
  segments: SegmentConfig[];
  onChange: (id: number, field: keyof SegmentConfig, value: number) => void;
  onReset: () => void;
  onRandomize: () => void;
}

export default function ControlPanel({ segments, onChange, onReset, onRandomize }: Props) {
  return (
    <div className="space-y-4 pb-8">
      <div className="flex gap-2 mb-4">
        <button 
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
        >
          <RefreshCw className="w-3 h-3" /> Reset
        </button>
        <button 
          onClick={onRandomize}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
        >
          <Shuffle className="w-3 h-3" /> Random
        </button>
      </div>

      {segments.map((seg, idx) => (
        <div key={seg.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
          <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex justify-between">
            <span>Segment {idx + 1}</span>
            <span className="text-slate-500 font-mono">ID: {seg.id}</span>
          </div>
          
          <div className="space-y-4">
            {/* Rotation */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 text-slate-400">
                <span className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-emerald-500" /> Rotation</span>
                <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">{seg.rotation}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="127" 
                value={seg.rotation}
                onChange={(e) => onChange(seg.id, 'rotation', parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Extension */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 text-slate-400">
                <span className="flex items-center gap-1.5"><Maximize2 className="w-3.5 h-3.5 text-blue-500" /> Extension</span>
                <span className="font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{seg.extension}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="127" 
                value={seg.extension}
                onChange={(e) => onChange(seg.id, 'extension', parseInt(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
