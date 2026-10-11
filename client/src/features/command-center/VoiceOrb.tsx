import { motion } from 'framer-motion';
import { AlertCircle, Glasses, Mic, MicOff, Radio, Send } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Badge, Button, Card, Skeleton } from '../../components/ui';
import { cn } from '../../lib/cn';
import { relativeTime } from '../../lib/format';
import { useOmiLatest } from '../../hooks/queries';
import { useAudioAnalyser } from '../../hooks/useAudioAnalyser';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useUiStore } from '../../store/uiStore';
import { SourceToggle } from './SourceToggle';
import { Waveform } from './Waveform';

type Phase = 'idle' | 'listening' | 'transcribing';

interface VoiceOrbProps {
  /** Receives a completed spoken (or Omi) instruction. */
  onResult: (text: string) => void;
  /** True while a run is streaming — reflected in the live status. */
  processing?: boolean;
}

export function VoiceOrb({ onResult, processing = false }: VoiceOrbProps) {
  const source = useUiStore((s) => s.source);
  const analyser = useAudioAnalyser();
  const [phase, setPhase] = useState<Phase>('idle');
  const omi = useOmiLatest(source === 'omi');

  const speech = useSpeechRecognition({
    onFinal: (transcript) => {
      setPhase('transcribing');
      onResult(transcript);
      window.setTimeout(() => setPhase((p) => (p === 'transcribing' ? 'idle' : p)), 1200);
    },
    onEnd: () => {
      analyser.stop();
      setPhase((p) => (p === 'transcribing' ? p : 'idle'));
    },
  });

  const isLive = speech.listening || analyser.active;
  const error = speech.error ?? analyser.error;

  const start = useCallback(async () => {
    speech.clearError();
    setPhase('listening');
    await analyser.start();
    if (speech.supported) speech.start();
  }, [analyser, speech]);

  const stop = useCallback(() => {
    speech.stop();
    analyser.stop();
    setPhase('idle');
  }, [analyser, speech]);

  const toggle = () => {
    if (isLive) stop();
    else void start();
  };

  const statusText = processing
    ? 'Agents are working…'
    : phase === 'transcribing'
      ? 'Got it — starting the workflow…'
      : isLive
        ? speech.interim || 'Listening…'
        : 'Tap the orb and speak your request';

  return (
    <Card className="@container flex h-full flex-col gap-4 p-4" spotlight>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Voice Input</h2>
        <span className="ml-auto">
          <SourceToggle />
        </span>
      </div>

      {source === 'browser' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="relative grid place-items-center">
            {isLive && (
              <>
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-accent-400/50 motion-reduce:animate-none" />
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-accent-400/30 [animation-delay:900ms] motion-reduce:animate-none" />
              </>
            )}
            <motion.button
              type="button"
              onClick={toggle}
              aria-label={isLive ? 'Stop recording' : 'Start voice input'}
              aria-pressed={isLive}
              whileTap={{ scale: 0.94 }}
              className={cn(
                'relative grid size-24 place-items-center rounded-full text-white shadow-e3 transition-shadow',
                'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400',
                isLive
                  ? 'bg-danger-500 shadow-[0_0_44px_oklch(0.64_0.22_25/0.5)]'
                  : 'bg-linear-to-br from-brand-500 to-accent-500 hover:shadow-glow-brand',
              )}
            >
              {isLive ? <MicOff className="size-9" /> : <Mic className="size-9" />}
            </motion.button>
          </div>

          <Waveform analyserRef={analyser.analyserRef} active={analyser.active} className="h-14 w-full" />

          <p aria-live="polite" className="min-h-5 text-center text-xs text-muted">
            {statusText}
          </p>

          {error && (
            <p
              role="alert"
              className="flex items-center gap-1.5 rounded-lg border border-warn-500/30 bg-warn-500/10 px-2.5 py-2 text-[0.7rem] text-warn-600 dark:text-warn-400"
            >
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </p>
          )}

          {!speech.supported && !error && (
            <p className="text-center text-[0.68rem] leading-relaxed text-subtle">
              Speech recognition isn’t available in this browser — type your request below. The orb
              still visualizes your microphone.
            </p>
          )}
        </div>
      ) : (
        <OmiPanel
          loading={omi.isLoading}
          transcript={omi.data?.transcript ?? null}
          count={omi.data?.count ?? 0}
          processing={processing}
          onSend={onResult}
        />
      )}
    </Card>
  );
}

function OmiPanel({
  loading,
  transcript,
  count,
  processing,
  onSend,
}: {
  loading: boolean;
  transcript: { text: string; receivedAt: string } | null;
  count: number;
  processing: boolean;
  onSend: (text: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-40" />
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line p-6 text-center">
        <Glasses className="size-6 text-subtle" />
        <p className="text-sm text-muted">No Omi transcript yet.</p>
        <p className="max-w-[17rem] text-[0.68rem] leading-relaxed text-subtle">
          Point your Omi webhook at <code className="text-muted">/api/voice/omi-webhook</code>, then
          speak. The latest segment appears here ({count} received).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge tone="research" mono>
          <Radio className="size-3" />
          omi
        </Badge>
        <span className="ml-auto text-[0.68rem] text-subtle">{relativeTime(transcript.receivedAt)}</span>
      </div>
      <p className="scrollbar-thin max-h-40 flex-1 overflow-y-auto rounded-xl border border-line bg-surface-1/50 p-3 text-sm leading-relaxed text-ink">
        {transcript.text}
      </p>
      <Button onClick={() => onSend(transcript.text)} disabled={processing}>
        <Send className="size-4" />
        Send to workflow
      </Button>
    </div>
  );
}
