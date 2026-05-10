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

  const [arm1Mode, setArm1Mode] = useState<'manual' | 'drifting' | 'ik'>(() => loadState('arm1Mode', 'manual'));
  const [arm2Mode, setArm2Mode] = useState<'manual' | 'drifting' | 'ik'>(() => loadState('arm2Mode', 'manual'));
  const [arm1Status, setArm1Status] = useState('manual');
  const [arm2Status, setArm2Status] = useState('manual');

  const [arm1Rate, setArm1Rate] = useState(() => loadState('arm1Rate', 1.0));
  const [arm2Rate, setArm2Rate] = useState(() => loadState('arm2Rate', 1.0));

  useEffect(() => { localStorage.setItem('arm1Rate', JSON.stringify(arm1Rate)); }, [arm1Rate]);
  useEffect(() => { localStorage.setItem('arm2Rate', JSON.stringify(arm2Rate)); }, [arm2Rate]);

  useEffect(() => { localStorage.setItem('arm1Mode', JSON.stringify(arm1Mode)); }, [arm1Mode]);
  useEffect(() => { localStorage.setItem('arm2Mode', JSON.stringify(arm2Mode)); }, [arm2Mode]);

  const [showUI, setShowUI] = useState(() => loadState('showUI', true));
  useEffect(() => { localStorage.setItem('showUI', JSON.stringify(showUI)); }, [showUI]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        setShowUI(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const physicalArmsRef = useRef<{arm1: any, arm2: any}>({ arm1: null, arm2: null });

  const targetsRef = useRef({ arm1Segments, arm1Gripper, arm2Segments, arm2Gripper });
  useEffect(() => {
    targetsRef.current = { arm1Segments, arm1Gripper, arm2Segments, arm2Gripper };
  }, [arm1Segments, arm1Gripper, arm2Segments, arm2Gripper]);

  useEffect(() => {
    const handlePhysicalUpdate = (e: Event) => {
      const ce = e as CustomEvent;
      physicalArmsRef.current = ce.detail;
    };
    window.addEventListener('physical-arm-update', handlePhysicalUpdate);
    return () => window.removeEventListener('physical-arm-update', handlePhysicalUpdate);
  }, []);

  useEffect(() => {
    if (arm1Mode !== 'drifting' && arm2Mode !== 'drifting') return;
    
    const isArmReached = (targetSegs: SegmentConfig[], targetGrip: {rotation: number, extension: number}, physArm: any) => {
      if (!physArm) return false;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(targetSegs[i].rotation - physArm.segments[i].rotation) > 0.5) return false;
        if (Math.abs(targetSegs[i].extension - physArm.segments[i].extension) > 0.5) return false;
      }
      if (Math.abs(targetGrip.rotation - physArm.gripper.rotation) > 0.5) return false;
      if (Math.abs(targetGrip.extension - physArm.gripper.extension) > 0.5) return false;
      return true;
    };

    const generateRandomSegments = (idOffset: number) => {
      return Array.from({ length: 3 }, (_, i) => ({
        id: i + idOffset,
        rotation: Math.floor(Math.random() * 128),
        extension: Math.floor(Math.random() * 128),
      }));
    };

    const generateRandomGripper = () => {
      return {
        rotation: Math.floor(Math.random() * 128),
        extension: Math.floor(Math.random() * 128),
      };
    };

    const intervalId = setInterval(() => {
      if (arm1Mode === 'drifting') {
        const phys1 = physicalArmsRef.current.arm1;
        if (isArmReached(targetsRef.current.arm1Segments, targetsRef.current.arm1Gripper, phys1)) {
          setArm1Segments(generateRandomSegments(0));
          setArm1Gripper(generateRandomGripper());
        }
      }

      if (arm2Mode === 'drifting') {
        const phys2 = physicalArmsRef.current.arm2;
        if (isArmReached(targetsRef.current.arm2Segments, targetsRef.current.arm2Gripper, phys2)) {
          setArm2Segments(generateRandomSegments(4));
          setArm2Gripper(generateRandomGripper());
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [arm1Mode, arm2Mode]);

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
    setArm1Rate(1.0);
  };

  const handleResetArm2 = () => {
    setArm2Segments(INITIAL_ARM2_SEGMENTS);
    setArm2Gripper({ rotation: 64, extension: 64 });
    setArm2Rate(1.0);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Left Sidebar (Arm 1) */}
      {showUI && (
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Arm 1 (CC 0-3, 16-19)</h2>
              <div className="text-[10px] uppercase font-mono mt-1 text-slate-400">Status: {arm1Mode === 'ik' ? arm1Status : arm1Mode}</div>
            </div>
            <label className="flex items-center cursor-pointer">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-2">Flipped</span>
              <input type="checkbox" className="hidden" checked={arm1Flipped} onChange={() => setArm1Flipped(!arm1Flipped)} />
              <div className={`w-7 h-3.5 rounded-full ${arm1Flipped ? 'bg-emerald-500/50' : 'bg-slate-700'} relative`}>
                <div className={`absolute w-2.5 h-2.5 rounded-full top-0.5 transition-all ${arm1Flipped ? 'right-0.5 bg-emerald-400' : 'left-0.5 bg-slate-400'}`}></div>
              </div>
            </label>
          </div>
          <div className="flex bg-slate-950 p-1 rounded mb-4">
            <button onClick={() => setArm1Mode('manual')} className={`flex-1 text-xs py-1 rounded ${arm1Mode === 'manual' ? 'bg-slate-800 font-bold' : 'text-slate-500 hover:bg-slate-900'}`}>Manual</button>
            <button onClick={() => setArm1Mode('drifting')} className={`flex-1 text-xs py-1 rounded ${arm1Mode === 'drifting' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-500 hover:bg-slate-900'}`}>Drifting</button>
            <button onClick={() => setArm1Mode('ik')} className={`flex-1 text-xs py-1 rounded ${arm1Mode === 'ik' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-slate-500 hover:bg-slate-900'}`}>IK</button>
          </div>
          
          <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 mb-4">
            <div className="flex justify-between text-xs mb-1.5 text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[10px]">Rate Limit</span>
              <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded text-[10px]">{arm1Rate.toFixed(2)}x</span>
            </div>
            <input 
              type="range" 
              min="-2" 
              max="2" 
              step="0.01" 
              value={Math.log2(arm1Rate)}
              onChange={(e) => setArm1Rate(Math.pow(2, parseFloat(e.target.value)))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
            />
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
      )}

      {/* Main Vis */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        <ManipulatorVis 
          showUI={showUI}
          arm1={{ segments: arm1Segments, gripper: arm1Gripper }} 
          arm2={{ segments: arm2Segments, gripper: arm2Gripper }} 
          arm1Rate={arm1Rate}
          arm2Rate={arm2Rate}
          isVacuumActive={isVacuumActive}
          markerTrigger={markerTrigger}
          arm1Mode={arm1Mode}
          arm2Mode={arm2Mode}
          onIkStatusChange={(arm, status) => {
            if (arm === 1) setArm1Status(status);
            else setArm2Status(status);
          }}
          onArm1Change={(segments, gripper) => {
            setArm1Segments(segments);
            setArm1Gripper(gripper);
          }}
          onArm2Change={(segments, gripper) => {
            setArm2Segments(segments);
            setArm2Gripper(gripper);
          }}
        />

        {/* Floating Left Panel (Dual Manipulator & MIDI Status) */}
        {showUI && (
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl z-20 w-72 pointer-events-auto">
            <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold text-emerald-400 tracking-tight flex items-center gap-2 pointer-events-none">
              <Settings className="w-5 h-5" />
              Dual Manipulator
            </h1>
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
        )}
      </div>

      {/* Right Sidebar (Arm 2) */}
      {showUI && (
      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Arm 2 (CC 4-7, 20-23)</h2>
              <div className="text-[10px] uppercase font-mono mt-1 text-slate-400">Status: {arm2Mode === 'ik' ? arm2Status : arm2Mode}</div>
            </div>
            <label className="flex items-center cursor-pointer">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-2">Flipped</span>
              <input type="checkbox" className="hidden" checked={arm2Flipped} onChange={() => setArm2Flipped(!arm2Flipped)} />
              <div className={`w-7 h-3.5 rounded-full ${arm2Flipped ? 'bg-emerald-500/50' : 'bg-slate-700'} relative`}>
                <div className={`absolute w-2.5 h-2.5 rounded-full top-0.5 transition-all ${arm2Flipped ? 'right-0.5 bg-emerald-400' : 'left-0.5 bg-slate-400'}`}></div>
              </div>
            </label>
          </div>
          <div className="flex bg-slate-950 p-1 rounded mb-4">
            <button onClick={() => setArm2Mode('manual')} className={`flex-1 text-xs py-1 rounded ${arm2Mode === 'manual' ? 'bg-slate-800 font-bold' : 'text-slate-500 hover:bg-slate-900'}`}>Manual</button>
            <button onClick={() => setArm2Mode('drifting')} className={`flex-1 text-xs py-1 rounded ${arm2Mode === 'drifting' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-500 hover:bg-slate-900'}`}>Drifting</button>
            <button onClick={() => setArm2Mode('ik')} className={`flex-1 text-xs py-1 rounded ${arm2Mode === 'ik' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-slate-500 hover:bg-slate-900'}`}>IK</button>
          </div>

          <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 mb-4">
            <div className="flex justify-between text-xs mb-1.5 text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[10px]">Rate Limit</span>
              <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded text-[10px]">{arm2Rate.toFixed(2)}x</span>
            </div>
            <input 
              type="range" 
              min="-2" 
              max="2" 
              step="0.01" 
              value={Math.log2(arm2Rate)}
              onChange={(e) => setArm2Rate(Math.pow(2, parseFloat(e.target.value)))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
            />
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
      )}
    </div>
  );
}
