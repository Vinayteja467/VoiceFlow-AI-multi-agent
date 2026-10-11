import { motion } from 'framer-motion';
import { Badge } from '../../components/ui';
import { TONES, type Tone } from '../../lib/agents';

interface HandoffConnectorProps {
  label: string;
  tone: Tone;
  /** Previous step is done → the handoff actually happened. */
  active: boolean;
}

/** Animated vertical connector between two timeline nodes, labelled with the
 *  data that was passed forward (e.g. "6 findings → Planning"). */
export function HandoffConnector({ label, tone, active }: HandoffConnectorProps) {
  const raw = TONES[tone].raw;

  return (
    <div className="relative h-10" aria-hidden="true">
      <motion.span
        className="absolute left-[1.875rem] top-0 h-full w-px -translate-x-1/2 origin-top rounded-full"
        style={{
          backgroundImage: active
            ? `linear-gradient(to bottom, ${raw}, transparent)`
            : 'linear-gradient(to bottom, var(--line), var(--line))',
        }}
        initial={false}
        animate={{ opacity: active ? 1 : 0.45, scaleY: active ? 1 : 0.55 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      />
      <span className="absolute left-[3.25rem] top-1/2 -translate-y-1/2">
        {active ? (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex"
          >
            <Badge tone="outline" className="border-line bg-surface-2/70 font-mono text-[0.62rem] backdrop-blur">
              {label}
            </Badge>
          </motion.span>
        ) : (
          <Badge tone="outline" className="border-dashed text-subtle opacity-60 font-mono text-[0.62rem]">
            waiting…
          </Badge>
        )}
      </span>
    </div>
  );
}
