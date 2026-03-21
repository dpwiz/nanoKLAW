import React from 'react';
import { SegmentConfig } from '../types';
import { RotateCcw, Maximize2, Grip } from 'lucide-react';

interface Props {
  segments: SegmentConfig[];
  gripper: { rotation: number; extension: number };
  onChange: (id: number, field: keyof SegmentConfig, value: number) => void;
  onGripperChange: (field: 'rotation' | 'extension', value: number) => void;
  segmentTitlePrefix: string;
  gripperIdLabel: string;
}

export default function ControlPanel({ 
  segments, gripper, 
  onChange, onGripperChange, 
  segmentTitlePrefix, gripperIdLabel
}: Props) {

  const renderSegmentControls = (
    segments: SegmentConfig[], 
    onChange: (id: number, field: keyof SegmentConfig, value: number) => void,
    titlePrefix: string
  ) => {
    return segments.map((seg, idx) => (
      <div key={seg.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
        <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex justify-between">
          <span>{titlePrefix} {idx + 1}</span>
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
    ));
  };

  const renderGripperControl = (
    gripper: { rotation: number; extension: number },
    onChange: (field: 'rotation' | 'extension', value: number) => void,
    title: string,
    idLabel: string
  ) => {
    return (
      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/50 hover:border-slate-500/50 transition-colors">
        <div className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex justify-between">
          <span className="flex items-center gap-1.5"><Grip className="w-4 h-4 text-rose-500" /> {title}</span>
          <span className="text-slate-500 font-mono">ID: {idLabel}</span>
        </div>
        
        <div className="space-y-4">
          {/* Gripper Rotation */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-slate-400">
              <span className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-emerald-500" /> Rotation</span>
              <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">{gripper.rotation}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="127" 
              value={gripper.rotation}
              onChange={(e) => onChange('rotation', parseInt(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Gripper Open/Close (Extension) */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-slate-400">
              <span className="flex items-center gap-1.5"><Maximize2 className="w-3.5 h-3.5 text-rose-500" /> Open/Close</span>
              <span className="font-mono text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded">{gripper.extension}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="127" 
              value={gripper.extension}
              onChange={(e) => onChange('extension', parseInt(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {renderSegmentControls(segments, onChange, segmentTitlePrefix)}
      {renderGripperControl(gripper, onGripperChange, `${segmentTitlePrefix} Gripper`, gripperIdLabel)}
    </div>
  );
}
