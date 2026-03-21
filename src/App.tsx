/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import ManipulatorVis from './components/ManipulatorVis';
import ControlPanel from './components/ControlPanel';
import { SegmentConfig } from './types';
import { Settings, Usb, AlertCircle } from 'lucide-react';
import { useMIDI } from './hooks/useMIDI';

const INITIAL_ARM1_SEGMENTS: SegmentConfig[] = Array.from({ length: 3 }, (_, i) => ({
  id: i,
  rotation: 64,
  extension: 64,
}));

const INITIAL_ARM2_SEGMENTS: SegmentConfig[] = Array.from({ length: 3 }, (_, i) => ({
  id: i + 4,
  rotation: 64,
  extension: 64,
}));

const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

export default function App() {
  const [arm1Segments, setArm1Segments] = useState<SegmentConfig[]>(() => loadState('arm1Segments', INITIAL_ARM1_SEGMENTS));
  const [arm1Gripper, setArm1Gripper] = useState(() => loadState('arm1Gripper', { rotation: 64, extension: 64 }));
  
  const [arm2Segments, setArm2Segments] = useState<SegmentConfig[]>(() => loadState('arm2Segments', INITIAL_ARM2_SEGMENTS));
  const [arm2Gripper, setArm2Gripper] = useState(() => loadState('arm2Gripper', { rotation: 64, extension: 64 }));
  const [isVacuumActive, setIsVacuumActive] = useState(() => loadState('isVacuumActive', true));
  const [markerTrigger, setMarkerTrigger] = useState(0);

  useEffect(() => { localStorage.setItem('arm1Segments', JSON.stringify(arm1Segments)); }, [arm1Segments]);
  useEffect(() => { localStorage.setItem('arm1Gripper', JSON.stringify(arm1Gripper)); }, [arm1Gripper]);
  useEffect(() => { localStorage.setItem('arm2Segments', JSON.stringify(arm2Segments)); }, [arm2Segments]);
  useEffect(() => { localStorage.setItem('arm2Gripper', JSON.stringify(arm2Gripper)); }, [arm2Gripper]);
  useEffect(() => { localStorage.setItem('isVacuumActive', JSON.stringify(isVacuumActive)); }, [isVacuumActive]);

  const [lastMidi, setLastMidi] = useState<{cc: number, value: number} | null>(null);

  const { deviceName, error } = useMIDI((cc, value) => {
    setLastMidi({ cc, value });

    // Vacuum Control
    if (cc === 42 && value === 127) {
      setIsVacuumActive(false);
      return;
    }
    if (cc === 41 && value === 127) {
      setIsVacuumActive(true);
      return;
    }
    if (cc === 45 && value === 127) {
      setMarkerTrigger(prev => prev + 1);
      return;
    }

    // Arm 1 Gripper (CC 3, CC 19)
    if (cc === 3) {
      setArm1Gripper(prev => ({ ...prev, extension: value }));
      return;
    }
    if (cc === 19) {
      setArm1Gripper(prev => ({ ...prev, rotation: value }));
      return;
    }

    // Arm 2 Gripper (CC 7, CC 23)
    if (cc === 7) {
      setArm2Gripper(prev => ({ ...prev, extension: value }));
      return;
    }
    if (cc === 23) {
      setArm2Gripper(prev => ({ ...prev, rotation: value }));
      return;
    }

    // Arm 1 Segments (CC 0-2, CC 16-18)
    if ((cc >= 0 && cc <= 2) || (cc >= 16 && cc <= 18)) {
      setArm1Segments(prev => {
        const next = [...prev];
        let changed = false;
        if (cc >= 0 && cc <= 2) {
          if (next[cc].extension !== value) {
            next[cc] = { ...next[cc], extension: value };
            changed = true;
          }
        } else {
          const idx = cc - 16;
          if (next[idx].rotation !== value) {
            next[idx] = { ...next[idx], rotation: value };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }

    // Arm 2 Segments (CC 4-6, CC 20-22)
    if ((cc >= 4 && cc <= 6) || (cc >= 20 && cc <= 22)) {
      setArm2Segments(prev => {
        const next = [...prev];
        let changed = false;
        if (cc >= 4 && cc <= 6) {
          const idx = cc - 4;
          if (next[idx].extension !== value) {
            next[idx] = { ...next[idx], extension: value };
            changed = true;
          }
        } else {
          const idx = cc - 20;
          if (next[idx].rotation !== value) {
            next[idx] = { ...next[idx], rotation: value };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  });

  const updateArm1Segment = (id: number, field: keyof SegmentConfig, value: number) => {
    setArm1Segments(prev => prev.map(seg => seg.id === id ? { ...seg, [field]: value } : seg));
  };

  const updateArm2Segment = (id: number, field: keyof SegmentConfig, value: number) => {
    setArm2Segments(prev => prev.map(seg => seg.id === id ? { ...seg, [field]: value } : seg));
  };

  const updateArm1Gripper = (field: 'rotation' | 'extension', value: number) => {
    setArm1Gripper(prev => ({ ...prev, [field]: value }));
  };

  const updateArm2Gripper = (field: 'rotation' | 'extension', value: number) => {
    setArm2Gripper(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setArm1Segments(INITIAL_ARM1_SEGMENTS);
    setArm1Gripper({ rotation: 64, extension: 64 });
    setArm2Segments(INITIAL_ARM2_SEGMENTS);
    setArm2Gripper({ rotation: 64, extension: 64 });
  };

  const handleRandomize = () => {
    setArm1Segments(prev => prev.map(seg => ({
      ...seg,
      rotation: Math.floor(Math.random() * 128),
      extension: Math.floor(Math.random() * 128)
    })));
    setArm1Gripper({
      rotation: Math.floor(Math.random() * 128),
      extension: Math.floor(Math.random() * 128)
    });
    setArm2Segments(prev => prev.map(seg => ({
      ...seg,
      rotation: Math.floor(Math.random() * 128),
      extension: Math.floor(Math.random() * 128)
    })));
    setArm2Gripper({
      rotation: Math.floor(Math.random() * 128),
      extension: Math.floor(Math.random() * 128)
    });
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Left Sidebar (Arm 1) */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <h2 className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-800 pb-2">Arm 1 (CC 0-3, 16-19)</h2>
          <ControlPanel 
            segments={arm1Segments} 
            gripper={arm1Gripper}
            onChange={updateArm1Segment}
            onGripperChange={updateArm1Gripper}
            segmentTitlePrefix="A1 Seg"
            gripperIdLabel="3"
          />
        </div>
      </div>

      {/* Main Vis */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        <ManipulatorVis 
          arm1={{ segments: arm1Segments, gripper: arm1Gripper }} 
          arm2={{ segments: arm2Segments, gripper: arm2Gripper }} 
          onReset={handleReset}
          onRandomize={handleRandomize}
          isVacuumActive={isVacuumActive}
          markerTrigger={markerTrigger}
        />

        {/* Floating Left Panel (Dual Manipulator & MIDI Status) */}
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl z-20 w-72 pointer-events-none">
          <h1 className="text-lg font-bold text-emerald-400 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Dual Manipulator
          </h1>
          <p className="text-xs text-slate-400 mt-1 mb-3">Two 3-Axis Arms + Grippers</p>
          
          {/* MIDI Status Indicator */}
          <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-slate-950 border ${error ? 'border-red-900/50 text-red-400' : deviceName ? 'border-emerald-900/50 text-emerald-400' : 'border-slate-800 text-slate-500'}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {error ? (
                <><AlertCircle className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{error}</span></>
              ) : deviceName ? (
                <><Usb className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{deviceName}</span></>
              ) : (
                <><Usb className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Waiting for MIDI...</span></>
              )}
            </div>
            {deviceName && lastMidi && (
              <div className="flex items-center gap-1.5 font-mono text-[10px] bg-emerald-900/30 px-1.5 py-0.5 rounded text-emerald-300 shrink-0">
                <span>CC:{lastMidi.cc.toString().padStart(3, '0')}</span>
                <span className="text-emerald-500/50">|</span>
                <span>V:{lastMidi.value.toString().padStart(3, '0')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar (Arm 2) */}
      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <h2 className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-800 pb-2">Arm 2 (CC 4-7, 20-23)</h2>
          <ControlPanel 
            segments={arm2Segments} 
            gripper={arm2Gripper}
            onChange={updateArm2Segment}
            onGripperChange={updateArm2Gripper}
            segmentTitlePrefix="A2 Seg"
            gripperIdLabel="7"
          />
        </div>
      </div>
    </div>
  );
}
