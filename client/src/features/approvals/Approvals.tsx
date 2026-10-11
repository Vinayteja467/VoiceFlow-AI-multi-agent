import { motion } from 'framer-motion';
import {
  CalendarPlus,
  Check,
  ChevronDown,
  Mail,
  MessageSquare,
  Pencil,
  RefreshCw,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, PageHeader, Stat } from '../../components/layout/PageHeader';
import { AnimatedNumber, Badge, Button, Card, Skeleton } from '../../components/ui';
import { useApprovals, useResolveApproval } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { relativeTime } from '../../lib/format';
import type { Approval, ApprovalActionType, ApprovalStatus } from '../../types';
import { JsonPanel } from '../command-center/JsonPanel';

type Tab = 'pending' | 'all' | 'approved' | 'rejected';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const ACTION_META: Record<ApprovalActionType, { icon: LucideIcon; label: string; tone: string }> = {
  email: { icon: Mail, label: 'Send email', tone: 'text-research' },
  calendar: { icon: CalendarPlus, label: 'Create event', tone: 'text-planning' },
  message: { icon: MessageSquare, label: 'Send message', tone: 'text-task' },
};

const STATUS_TONE: Record<ApprovalStatus, 'warn' | 'success' | 'danger'> = {
  pending: 'warn',
  approved: 'success',
  rejected: 'danger',
};

export function Approvals() {
  const approvalsQuery = useApprovals();
  const resolveApproval = useResolveApproval();

  const [tab, setTab] = useState<Tab>('pending');
  const [payloadOpen, setPayloadOpen] = useState<string | null>(null);
  const [editsFor, setEditsFor] = useState<string | null>(null);
  const [editsText, setEditsText] = useState('{}');
  const [confirmFor, setConfirmFor] = useState<{ id: string; action: 'approve' | 'reject' } | null>(
    null,
  );

  const approvals = approvalsQuery.data?.approvals ?? [];
  const pending = approvalsQuery.data?.pending ?? 0;

  const counts = useMemo(
    () => ({
      approved: approvals.filter((a) => a.status === 'approved').length,
      rejected: approvals.filter((a) => a.status === 'rejected').length,
      total: approvals.length,
    }),
    [approvals],
  );

  const visible = useMemo(
    () => (tab === 'all' ? approvals : approvals.filter((a) => a.status === tab)),
    [approvals, tab],
  );

  function resolve(approval: Approval, action: 'approve' | 'reject') {
    let edits: Record<string, unknown> | undefined;
    if (action === 'approve' && editsFor === approval.id) {
      const text = editsText.trim();
      if (text && text !== '{}') {
        try {
          const parsed: unknown = JSON.parse(text);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            toast.error('Edits must be a JSON object, e.g. { "to": "a@b.com" }');
            return;
          }
          edits = parsed as Record<string, unknown>;
        } catch (err) {
          toast.error(`Invalid JSON: ${(err as Error).message}`);
          return;
        }
      }
    }
    resolveApproval.mutate(
      { id: approval.id, input: { action, edits } },
      {
        onSuccess: () => toast.success(action === 'approve' ? 'Action approved' : 'Action rejected'),
        onError: (err) => toast.error(`Could not resolve: ${(err as Error).message}`),
      },
    );
    setConfirmFor(null);
    setEditsFor(null);
    setEditsText('{}');
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader
        icon={ShieldCheck}
        title="Approvals"
        description="The human gate. The Task agent may only queue external actions — nothing is executed until you approve it here."
        badge={
          <Badge tone={pending > 0 ? 'warn' : 'success'} mono size="lg">
            {pending > 0 ? `${pending} pending` : 'all clear'}
          </Badge>
        }
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => approvalsQuery.refetch()}
            aria-label="Refresh approvals"
          >
            <RefreshCw className={cn('size-4', approvalsQuery.isFetching && 'animate-spin')} />
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Pending" value={<AnimatedNumber value={pending} />} icon={ShieldCheck} tone="warn" />
        <Stat label="Approved" value={counts.approved} tone="success" />
        <Stat label="Rejected" value={counts.rejected} tone="danger" />
        <Stat label="Total" value={counts.total} />
      </div>

      <Card variant="plain" className="mb-4 flex items-start gap-3 border border-warn-500/30 bg-warn-500/10 p-3.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warn-500" />
        <p className="text-xs leading-relaxed text-muted">
          Approving records your decision in the audit log but does <strong className="text-ink">not</strong>{' '}
          send anything — this system never executes external actions on its own.
        </p>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface-1/50 p-1">
        {TABS.map((item) => {
          const count =
            item.id === 'all'
              ? counts.total
              : item.id === 'pending'
                ? pending
                : item.id === 'approved'
                  ? counts.approved
                  : counts.rejected;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                tab === item.id ? 'bg-surface-3 text-ink' : 'text-subtle hover:text-muted',
              )}
            >
              {item.label}
              <span className="font-mono text-[0.62rem] tabular-nums text-subtle">{count}</span>
            </button>
          );
        })}
      </div>

      {approvalsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : approvalsQuery.isError ? (
        <EmptyState
          icon={ShieldCheck}
          title="Couldn’t load approvals"
          message={(approvalsQuery.error as Error)?.message ?? 'The server did not respond.'}
          action={
            <Button variant="secondary" size="sm" onClick={() => approvalsQuery.refetch()}>
              <RefreshCw className="size-4" /> Retry
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={tab === 'pending' ? 'Nothing awaiting approval' : 'Nothing here yet'}
          message={
            tab === 'pending'
              ? 'When a run produces an external action, it will be held here for your decision.'
              : 'Resolved actions appear here with their full audit trail.'
          }
          action={
            tab === 'pending' && counts.total > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => setTab('all')}>
                View all {counts.total}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul key={tab} className="space-y-3">
          {visible.map((approval, index) => {
              const meta = ACTION_META[approval.actionType];
              const Icon = meta.icon;
              const isConfirming = confirmFor?.id === approval.id;
              const showPayload = payloadOpen === approval.id;
              const isEdits = editsFor === approval.id;

              return (
                <motion.li
                  key={approval.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.16, 1, 0.3, 1],
                    delay: Math.min(index * 0.04, 0.2),
                  }}
                >
                  <Card variant="solid" className="overflow-hidden">
                    <div className="flex items-start gap-3 p-3.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2">
                        <Icon className={cn('size-4', meta.tone)} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="outline" mono>
                            {approval.actionType}
                          </Badge>
                          <Badge tone={STATUS_TONE[approval.status]} mono>
                            {approval.status}
                          </Badge>
                          <span className="ml-auto text-[0.62rem] text-subtle">
                            {relativeTime(approval.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-ink">{approval.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{approval.description}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.62rem] text-subtle">
                          <span className="inline-flex items-center gap-1">
                            <Icon className="size-3" />
                            {meta.label}
                          </span>
                          <Link
                            to={`/history?run=${approval.runId}`}
                            className="font-mono transition-colors hover:text-brand-400"
                          >
                            run {approval.runId.slice(0, 8)}
                          </Link>
                          <span>
                            id <span className="font-mono text-muted">{approval.id.slice(0, 8)}</span>
                          </span>
                          {approval.resolvedAt && (
                            <span>resolved {relativeTime(approval.resolvedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-line px-3.5 py-2.5">
                      <button
                        type="button"
                        onClick={() => setPayloadOpen(showPayload ? null : approval.id)}
                        aria-expanded={showPayload}
                        className="inline-flex items-center gap-1.5 text-[0.68rem] font-medium text-subtle transition-colors hover:text-muted"
                      >
                        <ChevronDown
                          className={cn('size-3.5 transition-transform', showPayload && 'rotate-180')}
                        />
                        {showPayload ? 'Hide payload' : 'View payload'}
                      </button>

                      {showPayload && (
                        <motion.div
                          key="payload"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="pt-2.5">
                              <JsonPanel label="Action payload" value={approval.payload} />
                            </div>
                        </motion.div>
                      )}
                    </div>

                    {approval.audit.length > 0 && (
                      <div className="border-t border-line px-3.5 py-2.5">
                        <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-subtle">
                          Audit trail
                        </p>
                        <ol className="space-y-1.5">
                          {approval.audit.map((entry, index) => (
                            <li key={index} className="flex items-start gap-2 text-[0.68rem] text-muted">
                              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                              <span className="min-w-0">
                                <span className="font-medium text-ink">{entry.action}</span>
                                {entry.detail && <span className="text-subtle"> — {entry.detail}</span>}
                                <span className="ml-1.5 text-subtle">{relativeTime(entry.at)}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {approval.status === 'pending' && (
                      <div className="border-t border-line p-3">
                        {isConfirming ? (
                          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2/60 p-2">
                            <span className="text-xs text-muted">
                              {confirmFor.action === 'approve' ? 'Approve this action?' : 'Reject this action?'}
                            </span>
                            <Button
                              size="sm"
                              variant={confirmFor.action === 'approve' ? 'primary' : 'danger'}
                              className="ml-auto"
                              onClick={() => resolve(approval, confirmFor.action)}
                              disabled={resolveApproval.isPending}
                            >
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmFor(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => setConfirmFor({ id: approval.id, action: 'approve' })}
                            >
                              <Check className="size-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setConfirmFor({ id: approval.id, action: 'reject' })}
                            >
                              <X className="size-4" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-auto"
                              onClick={() => {
                                setEditsFor(isEdits ? null : approval.id);
                                setEditsText('{}');
                              }}
                            >
                              <Pencil className="size-3.5" />
                              {isEdits ? 'Cancel edits' : 'Approve with edits'}
                            </Button>
                          </div>
                        )}

                        {isEdits && (
                          <motion.div
                            key="edits"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                          >
                              <div className="pt-3">
                                <label
                                  htmlFor={`edits-${approval.id}`}
                                  className="mb-1 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-subtle"
                                >
                                  Edits (JSON, merged into the payload)
                                </label>
                                <textarea
                                  id={`edits-${approval.id}`}
                                  value={editsText}
                                  onChange={(event) => setEditsText(event.target.value)}
                                  rows={4}
                                  spellCheck={false}
                                  className="scrollbar-thin w-full resize-y rounded-lg border border-line bg-surface-2/70 px-3 py-2 font-mono text-[0.72rem] leading-relaxed text-ink transition-colors focus:border-accent-500/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
                                />
                              </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
