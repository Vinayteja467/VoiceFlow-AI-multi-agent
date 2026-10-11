import type { LucideIcon } from 'lucide-react';
import { Badge, Card } from '../components/ui';

interface PlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Minimal stage-placeholder (real views land in a later stage). */
export function Placeholder({ title, description, icon: Icon }: PlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-fluid-hero font-semibold text-ink">{title}</h1>
      </header>
      <Card spotlight className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand-400">
          <Icon className="size-7" />
        </span>
        <p className="max-w-md text-balance text-sm text-muted">{description}</p>
        <Badge tone="brand" mono size="lg">
          coming in a later stage
        </Badge>
      </Card>
    </div>
  );
}
