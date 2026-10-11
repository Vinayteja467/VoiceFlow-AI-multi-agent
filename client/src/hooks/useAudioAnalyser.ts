import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Microphone capture + Web Audio AnalyserNode for the recording waveform.
 * The analyser lives in a ref so the canvas can read frequency data per frame
 * without re-rendering React.
 */
export function useAudioAnalyser() {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const supported =
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';

  const start = useCallback(async () => {
    if (!supported) {
      setError('Microphone capture is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      setError(undefined);
      setActive(true);
    } catch {
      setError('Microphone permission was denied — type your request instead.');
    }
  }, [supported]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    analyserRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { supported, active, error, analyserRef, start, stop };
}
