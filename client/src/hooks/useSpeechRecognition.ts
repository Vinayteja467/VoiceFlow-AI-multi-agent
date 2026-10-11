import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechHandlers {
  onFinal?: (text: string) => void;
  onEnd?: () => void;
}

/**
 * Web Speech API wrapper with a graceful "unsupported" signal so the UI can
 * fall back to the text input. Interim results stream into `interim`.
 */
export function useSpeechRecognition(handlers: SpeechHandlers = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | undefined>();
  const recRef = useRef<SpeechRecognition | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const supported =
    typeof window !== 'undefined' && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError('Speech recognition is not supported in this browser — type your request below.');
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';

    rec.onstart = () => {
      setListening(true);
      setError(undefined);
    };
    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) finalText += alt.transcript;
        else interimText += alt.transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText.trim()) {
        setInterim('');
        handlersRef.current.onFinal?.(finalText.trim());
      }
    };
    rec.onerror = (event) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission denied — type your request instead.'
          : `Speech recognition error: ${event.error}`,
      );
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
      handlersRef.current.onEnd?.();
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [supported]);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(undefined), []);

  return { supported, listening, interim, error, start, stop, clearError };
}
