import { useEffect, useState, useRef } from 'react';

export function useMIDI(onCCMessage: (cc: number, value: number) => void) {
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCCMessageRef = useRef(onCCMessage);

  // Keep the callback ref up to date to avoid stale closures
  useEffect(() => {
    onCCMessageRef.current = onCCMessage;
  }, [onCCMessage]);

  useEffect(() => {
    if (!(navigator as any).requestMIDIAccess) {
      setError('Web MIDI API not supported in this browser.');
      return;
    }

    let selectedInput: any = null;

    const handleMessage = (event: any) => {
      const [status, data1, data2] = event.data;
      // CC message on Channel 1 (0xB0 = 176)
      if (status === 176) {
        onCCMessageRef.current(data1, data2);
      }
    };

    const connectDevice = (access: any) => {
      let targetInput: any = null;
      
      // Try to find nanoKONTROL first
      for (const input of access.inputs.values()) {
        if (input.name && input.name.startsWith('nanoKONTROL')) {
          targetInput = input;
          break;
        }
      }

      // Fallback to first available MIDI input
      if (!targetInput) {
        for (const input of access.inputs.values()) {
          targetInput = input;
          break;
        }
      }

      if (targetInput) {
        // Clean up previous listener if switching devices
        if (selectedInput && selectedInput.id !== targetInput.id) {
           selectedInput.onmidimessage = null;
        }
        targetInput.onmidimessage = handleMessage;
        setDeviceName(targetInput.name || 'Unknown MIDI Device');
        selectedInput = targetInput;
      } else {
        setDeviceName(null);
      }
    };

    (navigator as any).requestMIDIAccess()
      .then((access: any) => {
        connectDevice(access);
        access.onstatechange = () => connectDevice(access);
      })
      .catch((err: any) => {
        console.error("MIDI access error:", err);
        setError('MIDI access denied. Please allow MIDI permissions.');
      });

    return () => {
      if (selectedInput) {
        selectedInput.onmidimessage = null;
      }
    };
  }, []);

  return { deviceName, error };
}
