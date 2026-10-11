import { useEffect } from 'react';
import { useRunStore } from '../store/runStore';
import type { RunEvent } from '../types';

/**
 * Subscribe to a run's SSE stream and reduce events into the run store.
 *
 * The server sends `event: step` (a RunEvent) and `event: done` ({ runId }).
 * EventSource reconnects automatically (the server sets `retry: 3000`); we only
 * flip to a hard error state when the connection is fully CLOSED.
 */
export function useRunStream(runId: string | null): void {
  const ingest = useRunStore((s) => s.ingest);
  const setStreamState = useRunStore((s) => s.setStreamState);

  useEffect(() => {
    if (!runId) return;

    setStreamState('connecting');
    const es = new EventSource(`/api/runs/${runId}/stream`);

    const onOpen = () => setStreamState('open');

    const onStep = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        ingest(JSON.parse(message.data) as RunEvent);
      } catch {
        /* ignore malformed frame */
      }
    };

    const onDone = () => {
      setStreamState('closed');
      es.close();
    };

    es.addEventListener('open', onOpen);
    es.addEventListener('step', onStep);
    es.addEventListener('done', onDone);

    es.addEventListener('error', () => {
      // readyState 2 === CLOSED → it will not reconnect. 0/1 → it is retrying.
      if (es.readyState === EventSource.CLOSED) {
        setStreamState('error', 'Live connection closed — start a new run or check the server.');
      } else {
        setStreamState('connecting', 'Reconnecting to the live stream…');
      }
    });

    return () => {
      es.removeEventListener('open', onOpen);
      es.removeEventListener('step', onStep);
      es.removeEventListener('done', onDone);
      es.close();
    };
  }, [runId, ingest, setStreamState]);
}
