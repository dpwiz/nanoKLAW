/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import ManipulatorVis from './components/ManipulatorVis';
import ControlPanel from './components/ControlPanel';
import { SegmentConfig } from './types';
import { Settings, Usb, AlertCircle } from 'lucide-react';
import { useMIDI } from './hooks/useMIDI';

const INITIAL_SEGMENTS: SegmentConfig[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  rotation: 64,
  extension: 64,
}));

export default function App() {
  const [segments, setSegments] = useState<SegmentConfig[]>(INITIAL_SEGMENTS);

  const { deviceName, error } = useMIDI((cc, value) => {
    setSegments(prev => {
      const next = [...prev];
      let changed = false;
      
      // Linear controls (extension): CC 0..7
      if (cc >= 0 && cc <= 7) {
        if (next[cc].extension !== value) {
          next[cc] = { ...next[cc], extension: value };
          changed = true;
        }
      } 
      // Rotary controls (rotation): CC 16..23
      else if (cc >= 16 && cc <= 23) {
        const idx = cc - 16;
        if (next[idx].rotation !== value) {
          next[idx] = { ...next[idx], rotation: value };
          changed = true;
        }
      }
      
      return changed ? next : prev;
    });
  });

  const updateSegment = (id: number, field: keyof SegmentConfig, value: number) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, [field]: value } : seg));
  };

  const handleReset = () => {
    setSegments(INITIAL_SEGMENTS);
  };

  const handleRandomize = () => {
    setSegments(prev => prev.map(seg => ({
      ...seg,
      rotation: Math.floor(Math.random() * 128),
      extension: Math.floor(Math.random() * 128)
    })));
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <h1 className="text-lg font-bold text-emerald-400 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manipulator Control
          </h1>
          <p className="text-xs text-slate-400 mt-1 mb-3">8-Axis Rotational & Linear</p>
          
          {/* MIDI Status Indicator */}
          <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-slate-950 border ${error ? 'border-red-900/50 text-red-400' : deviceName ? 'border-emerald-900/50 text-emerald-400' : 'border-slate-800 text-slate-500'}`}>
            {error ? (
              <><AlertCircle className="w-3.5 h-3.5" /> {error}</>
            ) : deviceName ? (
              <><Usb className="w-3.5 h-3.5" /> {deviceName}</>
            ) : (
              <><Usb className="w-3.5 h-3.5" /> Waiting for MIDI...</>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <ControlPanel 
            segments={segments} 
            onChange={updateSegment} 
            onReset={handleReset}
            onRandomize={handleRandomize}
          />
        </div>
      </div>

      {/* Main Vis */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        <ManipulatorVis segments={segments} />
      </div>
    </div>
  );
}
