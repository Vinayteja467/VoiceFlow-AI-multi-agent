import { useEffect, useRef, type RefObject } from 'react';

interface WaveformProps {
  analyserRef: RefObject<AnalyserNode | null>;
  active: boolean;
  className?: string;
}

const BAR_COUNT = 44;
const BAR_GAP = 2;

/** Canvas frequency-bar visualizer driven by an AnalyserNode (idle = gentle ripple). */
export function Waveform({ analyserRef, active, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = new Uint8Array(256);
    let phase = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      if (analyser && active) analyser.getByteFrequencyData(data);

      const barWidth = Math.max(1.5, (width - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        let value: number;
        if (analyser && active) {
          const index = Math.floor((i / BAR_COUNT) * 64);
          value = (data[index] ?? 0) / 255;
        } else {
          value = 0.08 + 0.05 * Math.abs(Math.sin(phase + i * 0.42));
        }
        const barHeight = Math.max(2, value * height * 0.92);
        const x = i * (barWidth + BAR_GAP);
        const y = (height - barHeight) / 2;
        const alpha = 0.28 + value * 0.72;

        ctx.fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
        const radius = Math.min(barWidth / 2, 2);
        // roundRect is widely supported but not universal — fall back to fillRect.
        const drawRounded = (ctx as CanvasRenderingContext2D & {
          roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
        }).roundRect;
        if (typeof drawRounded === 'function') {
          ctx.beginPath();
          drawRounded.call(ctx, x, y, barWidth, barHeight, radius);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      phase += 0.045;
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [analyserRef, active]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
