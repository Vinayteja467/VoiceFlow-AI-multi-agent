import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
}

/** Counts from the previous value to the next one (skipped for reduced motion). */
export function AnimatedNumber({
  value,
  duration = 0.8,
  format = (n) => Math.round(n).toString(),
  className,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={className}>
      <span className="tabular-nums">{format(display)}</span>
    </span>
  );
}
