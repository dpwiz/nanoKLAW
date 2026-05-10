/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ManipulatorVis from './components/ManipulatorVis';
import ControlPanel from './components/ControlPanel';
import { SegmentConfig } from './types';
import { Settings, Usb, AlertCircle, Waves } from 'lucide-react';
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

  const [arm1Flipped, setArm1Flipped] = useState(() => loadState('arm1Flipped', false));
  const [arm2Flipped, setArm2Flipped] = useState(() => loadState('arm2Flipped', true));

  useEffect(() => { localStorage.setItem('arm1Flipped', JSON.stringify(arm1Flipped)); }, [arm1Flipped]);
  useEffect(() => { localStorage.setItem('arm2Flipped', JSON.stringify(arm2Flipped)); }, [arm2Flipped]);

  const [isDrifting, setIsDrifting] = useState(false);
  const driftTargetsRef = useRef({
    arm1Segs: Array.from({ length: 3 }, () => ({ rot: 64, ext: 64 })),
    arm1Grip: { rot: 64, ext: 64 },
    arm2Segs: Array.from({ length: 3 }, () => ({ rot: 64, ext: 64 })),
    arm2Grip: { rot: 64, ext: 64 },
  });

  useEffect(() => {
    if (!isDrifting) return;
    
    const step = (current: number, target: number) => {
      if (current < target) return current + 1;
      if (current > target) return current - 1;
      return current;
    };
    
    const maybeNewTarget = (current: number, target: number) => {
      if (current === target || Math.random() < 0.005) {
        return Math.floor(Math.random() * 128);
      }
      return target;
    };

    const intervalId = setInterval(() => {
      setArm1Segments(prev => prev.map((seg, i) => {
        const tRot = maybeNewTarget(seg.rotation, driftTargetsRef.current.arm1Segs[i].rot);
        const tExt = maybeNewTarget(seg.extension, driftTargetsRef.current.arm1Segs[i].ext);
        driftTargetsRef.current.arm1Segs[i] = { rot: tRot, ext: tExt };
        return {
          ...seg,
          rotation: step(seg.rotation, tRot),
          extension: step(seg.extension, tExt)
        };
      }));

      setArm2Segments(prev => prev.map((seg, i) => {
        const tRot = maybeNewTarget(seg.rotation, driftTargetsRef.current.arm2Segs[i].rot);
        const tExt = maybeNewTarget(seg.extension, driftTargetsRef.current.arm2Segs[i].ext);
        driftTargetsRef.current.arm2Segs[i] = { rot: tRot, ext: tExt };
        return {
          ...seg,
          rotation: step(seg.rotation, tRot),
          extension: step(seg.extension, tExt)
        };
      }));

      setArm1Gripper(prev => {
        const tRot = maybeNewTarget(prev.rotation, driftTargetsRef.current.arm1Grip.rot);
        const tExt = maybeNewTarget(prev.extension, driftTargetsRef.current.arm1Grip.ext);
        driftTargetsRef.current.arm1Grip = { rot: tRot, ext: tExt };
        return {
          ...prev,
          rotation: step(prev.rotation, tRot),
          extension: step(prev.extension, tExt)
        };
      });

      setArm2Gripper(prev => {
        const tRot = maybeNewTarget(prev.rotation, driftTargetsRef.current.arm2Grip.rot);
        const tExt = maybeNewTarget(prev.extension, driftTargetsRef.current.arm2Grip.ext);
        driftTargetsRef.current.arm2Grip = { rot: tRot, ext: tExt };
        return {
          ...prev,
          rotation: step(prev.rotation, tRot),
          extension: step(prev.extension, tExt)
        };
      });
    }, 50);

    return () => clearInterval(intervalId);
  }, [isDrifting]);

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

    const mapCC = (armFlipped: boolean, baseCC: number, targetInMapping: number) => {
      // 0=base, 1=mid, 2=tip, 3=gripper
      return armFlipped ? baseCC + (3 - targetInMapping) : baseCC + targetInMapping;
    };

    const isTargetCC = (cc: number, baseCC: number, armFlipped: boolean, targetInMapping: number) => {
      const mappedExt = mapCC(armFlipped, baseCC, targetInMapping);
      const mappedRot = mapCC(armFlipped, baseCC + 16, targetInMapping);
      return { isExt: cc === mappedExt, isRot: cc === mappedRot };
    };

    // Check Arm 1 (Base CC: 0)
    for (let comp = 0; comp < 4; comp++) {
      const match = isTargetCC(cc, 0, arm1Flipped, comp);
      if (match.isExt || match.isRot) {
        if (comp === 3) {
          // Gripper
          setArm1Gripper(prev => ({ ...prev, [match.isExt ? 'extension' : 'rotation']: value }));
        } else {
          // Segment
          setArm1Segments(prev => {
            const next = [...prev];
            if (next[comp][match.isExt ? 'extension' : 'rotation'] !== value) {
                next[comp] = { ...next[comp], [match.isExt ? 'extension' : 'rotation']: value };
                return next;
            }
            return prev;
          });
        }
        return; // Handled
      }
    }

    // Check Arm 2 (Base CC: 4)
    for (let comp = 0; comp < 4; comp++) {
      const match = isTargetCC(cc, 4, arm2Flipped, comp);
      if (match.isExt || match.isRot) {
        if (comp === 3) {
          // Gripper
          setArm2Gripper(prev => ({ ...prev, [match.isExt ? 'extension' : 'rotation']: value }));
        } else {
          // Segment
          setArm2Segments(prev => {
            const next = [...prev];
            if (next[comp][match.isExt ? 'extension' : 'rotation'] !== value) {
                next[comp] = { ...next[comp], [match.isExt ? 'extension' : 'rotation']: value };
                return next;
            }
            return prev;
          });
        }
        return; // Handled
      }
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

  const handleResetArm1 = () => {
    setArm1Segments(INITIAL_ARM1_SEGMENTS);
    setArm1Gripper({ rotation: 64, extension: 64 });
  };

  const handleResetArm2 = () => {
    setArm2Segments(INITIAL_ARM2_SEGMENTS);
    setArm2Gripper({ rotation: 64, extension: 64 });
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Left Sidebar (Arm 1) */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-200">Arm 1 (CC 0-3, 16-19)</h2>
            <label className="flex items-center cursor-pointer">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-2">Flipped</span>
              <input type="checkbox" className="hidden" checked={arm1Flipped} onChange={() => setArm1Flipped(!arm1Flipped)} />
              <div className={`w-7 h-3.5 rounded-full ${arm1Flipped ? 'bg-emerald-500/50' : 'bg-slate-700'} relative`}>
                <div className={`absolute w-2.5 h-2.5 rounded-full top-0.5 transition-all ${arm1Flipped ? 'right-0.5 bg-emerald-400' : 'left-0.5 bg-slate-400'}`}></div>
              </div>
            </label>
          </div>
          <ControlPanel 
            segments={arm1Segments} 
            gripper={arm1Gripper}
            onChange={updateArm1Segment}
            onGripperChange={updateArm1Gripper}
            segmentTitlePrefix="A1 Seg"
            baseCc={0}
            flipped={arm1Flipped}
            onReset={handleResetArm1}
          />
        </div>
      </div>

      {/* Main Vis */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        <ManipulatorVis 
          arm1={{ segments: arm1Segments, gripper: arm1Gripper }} 
          arm2={{ segments: arm2Segments, gripper: arm2Gripper }} 
          isVacuumActive={isVacuumActive}
          markerTrigger={markerTrigger}
        />

        {/* Floating Left Panel (Dual Manipulator & MIDI Status) */}
        <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl z-20 w-72 pointer-events-auto">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold text-emerald-400 tracking-tight flex items-center gap-2 pointer-events-none">
              <Settings className="w-5 h-5" />
              Dual Manipulator
            </h1>
            <button
              onClick={() => setIsDrifting(!isDrifting)}
              className={`p-1.5 rounded-lg border transition-colors ${isDrifting ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
              title={isDrifting ? "Stop Auto-Drift" : "Start Auto-Drift"}
            >
              <Waves className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3 pointer-events-none">Two 3-Axis Arms + Grippers</p>
          
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
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-200">Arm 2 (CC 4-7, 20-23)</h2>
            <label className="flex items-center cursor-pointer">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-2">Flipped</span>
              <input type="checkbox" className="hidden" checked={arm2Flipped} onChange={() => setArm2Flipped(!arm2Flipped)} />
              <div className={`w-7 h-3.5 rounded-full ${arm2Flipped ? 'bg-emerald-500/50' : 'bg-slate-700'} relative`}>
                <div className={`absolute w-2.5 h-2.5 rounded-full top-0.5 transition-all ${arm2Flipped ? 'right-0.5 bg-emerald-400' : 'left-0.5 bg-slate-400'}`}></div>
              </div>
            </label>
          </div>
          <ControlPanel 
            segments={arm2Segments} 
            gripper={arm2Gripper}
            onChange={updateArm2Segment}
            onGripperChange={updateArm2Gripper}
            segmentTitlePrefix="A2 Seg"
            baseCc={4}
            flipped={arm2Flipped}
            onReset={handleResetArm2}
          />
        </div>
      </div>
    </div>
  );
}
