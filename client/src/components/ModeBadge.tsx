import { Radio, FlaskConical } from 'lucide-react';
import { useHealth } from '../hooks/queries';
import { Badge, Skeleton, StatusDot, Tooltip } from './ui';

/** Live/Demo badge sourced from GET /api/health. */
export function ModeBadge() {
  const { data, isLoading, isError } = useHealth();

  if (isLoading) return <Skeleton className="h-6 w-20 rounded-full" />;

  if (isError || !data) {
    return (
      <Badge tone="danger" mono>
        offline
      </Badge>
    );
  }

  const isLive = data.mode === 'live';

  return (
    <Tooltip
      side="bottom"
      label={
        isLive
          ? `Live · Lyzr agents · embeddings: ${data.embeddingProvider}`
          : `Demo mode · simulated agents · embeddings: ${data.embeddingProvider} (no keys required)`
      }
    >
      <Badge tone={isLive ? 'success' : 'warn'} mono className="gap-1.5">
        <StatusDot status={isLive ? 'done' : 'running'} pulse={!isLive} />
        {isLive ? <Radio className="size-3" /> : <FlaskConical className="size-3" />}
        {isLive ? 'live' : 'demo'}
      </Badge>
    </Tooltip>
  );
}
