import type {
  ComparisonRow,
  Finding,
  PlanBlock,
  PlanOutput,
  Priority,
  RetrievedMemory,
  TaskAgentOutput,
  TaskItem,
} from '../types.js';

/**
 * DEMO_MODE simulation engine.
 *
 * Produces realistic, topic-aware agent outputs so the full pipeline is
 * demoable with zero API keys. The same shapes (and zod schemas) are used as
 * the live Lyzr path — only the generation strategy differs.
 *
 * Memory influence: retrieved memories are woven into the simulated outputs
 * (findings cite them, plans honor stated preferences), which makes the
 * "memory visibly affects agents" requirement demonstrable.
 */

interface TopicProfile {
  label: string;
  keywords: string[];
  findings: Omit<Finding, 'relevanceScore'>[];
  options: { name: string; pros: string[]; cons: string[] }[];
  blocks: { day: string; block: string; priority: Priority }[];
  tasks: { title: string; offsetDays: number; priority: Priority; owner: string }[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Topic profiles
// ---------------------------------------------------------------------------

const PROFILES: TopicProfile[] = [
  {
    label: 'AI hackathons',
    keywords: ['hackathon', 'hackathons'],
    findings: [
      {
        title: 'Major AI hackathons accepting applications for the current season',
        summary:
          'Several flagship AI hackathons are open or opening soon: Lablab.ai runs weekly AI challenges with prizes up to $5,000; the Anthropic Hackathon and AWS AI Hackathon accept team registrations through the month; university-hosted events (MIT, Stanford) offer free entry with travel grants.',
        source: 'web search',
        date: todayPlus(0),
        tags: ['hackathon', 'ai', 'prizes'],
      },
      {
        title: 'Team formation and prize trends in 2026 AI competitions',
        summary:
          'Winning teams typically combine an ML engineer, a designer, and a domain expert. Prize pools have grown ~40% year-over-year, with agentic-AI and eval-harness tracks being the most common new categories this season.',
        source: 'web search',
        date: todayPlus(-1),
        tags: ['teams', 'strategy'],
      },
      {
        title: 'What judges score in agentic-AI hackathon rubrics',
        summary:
          'Rubrics consistently weight: novelty (30%), technical execution (25%), real-world applicability (25%), and demo quality (20%). Multi-agent systems score high on novelty when each agent has a distinct, visible role.',
        source: 'web search',
        date: todayPlus(-2),
        tags: ['judging', 'rubric'],
      },
      {
        title: 'Application timelines and deadlines',
        summary:
          'Most hackathons close registration 1-2 weeks before the event. Early-bird tracks often include mentorship access, which correlates with higher finalist rates.',
        source: 'web search',
        date: todayPlus(-3),
        tags: ['deadlines', 'planning'],
      },
    ],
    options: [
      {
        name: 'Lablab.ai weekly challenges',
        pros: ['Weekly cadence — low commitment', 'Cash prizes', 'Beginner-friendly tracks'],
        cons: ['Smaller prize pools', 'Less prestige than flagship events'],
      },
      {
        name: 'Flagship weekend hackathon (e.g. Anthropic/AWS)',
        pros: ['Large prizes & press', 'Recruiter presence', 'Mentor access'],
        cons: ['Competitive qualification', 'Weekend time-boxed', 'Team of 3-4 required'],
      },
      {
        name: 'University-hosted AI event',
        pros: ['Free entry', 'Travel grants', 'Strong learning environment'],
        cons: ['Student-focused', 'Smaller networks'],
      },
    ],
    blocks: [
      { day: 'Monday', block: '09:00-11:00 — Pick event & register', priority: 'P0' },
      { day: 'Tuesday', block: '18:00-20:00 — Team formation + ideation', priority: 'P0' },
      { day: 'Wednesday', block: '18:00-21:00 — Core build sprint 1', priority: 'P0' },
      { day: 'Thursday', block: '18:00-20:00 — Mentor feedback session', priority: 'P1' },
      { day: 'Friday', block: '18:00-21:00 — Core build sprint 2 + demo prep', priority: 'P0' },
      { day: 'Saturday', block: '10:00-13:00 — Final integration & rehearsal', priority: 'P1' },
      { day: 'Sunday', block: '14:00-16:00 — Submission + retro', priority: 'P2' },
    ],
    tasks: [
      { title: 'Shortlist 3 hackathons and compare prizes/deadlines', offsetDays: 0, priority: 'P0', owner: 'user' },
      { title: 'Register for the primary hackathon', offsetDays: 1, priority: 'P0', owner: 'user' },
      { title: 'Recruit 2 teammates (ML + design)', offsetDays: 2, priority: 'P0', owner: 'user' },
      { title: 'Draft problem statement & success metrics', offsetDays: 2, priority: 'P1', owner: 'user' },
      { title: 'Scaffold multi-agent architecture', offsetDays: 3, priority: 'P0', owner: 'user' },
      { title: 'Build core agent loop end-to-end', offsetDays: 4, priority: 'P0', owner: 'user' },
      { title: 'Record 90-second demo video', offsetDays: 5, priority: 'P1', owner: 'user' },
      { title: 'Submit application + retro notes', offsetDays: 6, priority: 'P1', owner: 'user' },
    ],
  },
  {
    label: 'generic research & planning',
    keywords: [],
    findings: [
      {
        title: 'Landscape overview of the requested topic',
        summary:
          'The field is active this quarter: three major developments stand out — new tooling that cuts setup time roughly in half, a shift toward multi-agent patterns, and growing community consensus on evaluation practices.',
        source: 'web search',
        date: todayPlus(0),
        tags: ['landscape', 'overview'],
      },
      {
        title: 'Common pitfalls teams hit in this space',
        summary:
          'Post-mortems point to three recurring failure modes: unclear success metrics, over-scoped first attempts, and skipping the approval step for outward-facing actions. Teams that time-box a spike first ship 2x more often.',
        source: 'web search',
        date: todayPlus(-1),
        tags: ['pitfalls', 'process'],
      },
      {
        title: 'Benchmarks and what "good" looks like',
        summary:
          'Mature implementations in this space typically hit three markers: reproducible outputs, a visible handoff trail between components, and an explicit human-approval gate for consequential actions.',
        source: 'web search',
        date: todayPlus(-2),
        tags: ['benchmarks', 'quality'],
      },
      {
        title: 'Resource and learning recommendations',
        summary:
          'The highest-signal resources are official documentation, two well-regarded deep-dive writeups, and community teardown threads. Allocating focused reading time early pays off during execution.',
        source: 'web search',
        date: todayPlus(-4),
        tags: ['learning', 'resources'],
      },
    ],
    options: [
      {
        name: 'Depth-first approach',
        pros: ['Deep expertise faster', 'Strong final quality'],
        cons: ['Slower start', 'Narrower exploration'],
      },
      {
        name: 'Breadth-first approach',
        pros: ['Full landscape early', 'Easier prioritization'],
        cons: ['Risk of shallowness', 'More rework later'],
      },
    ],
    blocks: [
      { day: 'Monday', block: '09:00-10:30 — Define success metrics', priority: 'P0' },
      { day: 'Tuesday', block: '09:00-12:00 — Exploration & reading', priority: 'P1' },
      { day: 'Wednesday', block: '09:00-12:00 — Time-boxed spike', priority: 'P0' },
      { day: 'Thursday', block: '09:00-11:00 — Review & pivot decision', priority: 'P1' },
      { day: 'Friday', block: '09:00-12:00 — Execution sprint', priority: 'P0' },
      { day: 'Saturday', block: '10:00-12:00 — Polish & docs', priority: 'P2' },
      { day: 'Sunday', block: '15:00-16:00 — Retro & next steps', priority: 'P2' },
    ],
    tasks: [
      { title: 'Write down 3 measurable success criteria', offsetDays: 0, priority: 'P0', owner: 'user' },
      { title: 'Complete focused reading pass on top resources', offsetDays: 1, priority: 'P1', owner: 'user' },
      { title: 'Run a time-boxed proof-of-concept spike', offsetDays: 2, priority: 'P0', owner: 'user' },
      { title: 'Decide: proceed, pivot, or stop', offsetDays: 3, priority: 'P0', owner: 'user' },
      { title: 'Execute the main build block', offsetDays: 4, priority: 'P0', owner: 'user' },
      { title: 'Polish, document, and prepare summary', offsetDays: 5, priority: 'P1', owner: 'user' },
      { title: 'Retro + capture follow-ups', offsetDays: 6, priority: 'P2', owner: 'user' },
    ],
  },
];

function matchProfile(request: string): TopicProfile {
  const lower = request.toLowerCase();
  for (const p of PROFILES.slice(0, -1)) {
    if (p.keywords.some((k) => lower.includes(k))) return p;
  }
  return PROFILES[PROFILES.length - 1]!;
}

function memoryTag(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return '';
  const top = memories[0]!;
  return ` Builds on your memory: "${top.text.slice(0, 80)}${top.text.length > 80 ? '…' : ''}".`;
}

// ---------------------------------------------------------------------------
// Step 2 — Research
// ---------------------------------------------------------------------------

export function simulateResearch(request: string, memories: RetrievedMemory[]): { findings: Finding[] } {
  const profile = matchProfile(request);
  const suffix = memoryTag(memories);
  const findings: Finding[] = profile.findings.map((f, i) => ({
    ...f,
    summary: f.summary + (i === 0 && suffix ? suffix : ''),
    relevanceScore: Math.max(0.55, 0.97 - i * 0.09),
  }));
  return { findings };
}

// ---------------------------------------------------------------------------
// Step 3 — Planning
// ---------------------------------------------------------------------------

export function simulatePlanning(
  request: string,
  research: { findings: Finding[] },
  memories: RetrievedMemory[],
): PlanOutput {
  const profile = matchProfile(request);
  const comparison: ComparisonRow[] = profile.options.map((o) => ({
    option: o.name,
    pros: o.pros,
    cons: o.cons,
    verdict:
      o === profile.options[0]
        ? 'Recommended for this week — fastest path to a submission-ready result.'
        : 'Viable alternative if the primary path is unavailable.',
  }));

  const weekPlan: PlanBlock[] = profile.blocks.map((b) => ({
    ...b,
    rationale: 'Directly advances the highest-priority success metric for this request.',
  }));

  const prefNote =
    memories.length > 0
      ? ` Plan honors your stated preference from memory ("${memories[0]!.text.slice(0, 60)}…").`
      : '';

  return {
    comparison,
    weekPlan,
    rationale: `With ${research.findings.length} research findings in hand, the plan sequences the highest-leverage work first (${profile.label}).${prefNote}`,
  };
}

// ---------------------------------------------------------------------------
// Step 4 — Task
// ---------------------------------------------------------------------------

export function simulateTaskAgent(plan: PlanOutput): TaskAgentOutput {
  const items: TaskItem[] = [
    {
      id: 't1',
      title: plan.weekPlan[0]!.block.split('—')[1]?.trim() ?? 'Kick off the plan',
      due: todayPlus(0),
      priority: 'P0',
      status: 'pending',
      owner: 'user',
      dependsOn: [],
    },
    {
      id: 't2',
      title: plan.weekPlan[1]!.block.split('—')[1]?.trim() ?? 'Advance the plan',
      due: todayPlus(1),
      priority: 'P0',
      status: 'pending',
      owner: 'user',
      dependsOn: ['t1'],
    },
    {
      id: 't3',
      title: plan.weekPlan[2]!.block.split('—')[1]?.trim() ?? 'Core execution',
      due: todayPlus(2),
      priority: 'P0',
      status: 'pending',
      owner: 'user',
      dependsOn: ['t2'],
    },
    {
      id: 't4',
      title: plan.weekPlan[4]!.block.split('—')[1]?.trim() ?? 'Second execution block',
      due: todayPlus(4),
      priority: 'P0',
      status: 'pending',
      owner: 'user',
      dependsOn: ['t3'],
    },
    {
      id: 't5',
      title: 'Review progress and adjust remaining blocks',
      due: todayPlus(3),
      priority: 'P1',
      status: 'pending',
      owner: 'user',
      dependsOn: ['t2'],
    },
    {
      id: 't6',
      title: 'Polish, document and prepare the final summary',
      due: todayPlus(5),
      priority: 'P1',
      status: 'pending',
      owner: 'user',
      dependsOn: ['t4'],
    },
    {
      id: 't7',
      title: 'Retro and capture follow-ups',
      due: todayPlus(6),
      priority: 'P2',
      status: 'pending',
      owner: 'user',
      dependsOn: ['t6'],
    },
  ];

  const externalActions = [
    {
      id: 'a1',
      actionType: 'email' as const,
      title: 'Email the preparation plan to your team',
      description:
        'Sends the week plan and task list from this run to your team inbox so everyone sees the commitments.',
      payload: {
        to: 'team@example.com',
        subject: `Preparation plan — ${todayPlus(6)}`,
        body: 'Hi team,\n\nHere is the plan VoiceFlow generated for this week:\n\n' +
          plan.weekPlan.map((b) => `• ${b.day} ${b.block} (${b.priority})`).join('\n') +
          '\n\nReview and flag conflicts by end of week.',
      },
    },
    {
      id: 'a2',
      actionType: 'calendar' as const,
      title: 'Create calendar block for the first deep-work session',
      description: 'Creates a 90-minute focus event for the highest-priority block of the week.',
      payload: {
        title: 'Deep work — kickoff block',
        start: `${todayPlus(0)}T09:00:00`,
        durationMinutes: 90,
      },
    },
  ];

  return {
    tasks: items,
    completionSummary:
      'Done means every P0 task is complete, the week plan has been executed block by block, and the team has received the summary email (pending your approval).',
    externalActions,
  };
}

// ---------------------------------------------------------------------------
// Step 6 — memory points to persist
// ---------------------------------------------------------------------------

export function memoryPointsFor(
  runId: string,
  findings: Finding[],
  plan: PlanOutput,
): { text: string; type: 'finding' | 'plan' | 'decision'; tags: string[] }[] {
  const profile = matchProfile(plan.rationale);
  const points: { text: string; type: 'finding' | 'plan' | 'decision'; tags: string[] }[] = [];
  for (const f of findings.slice(0, 4)) {
    points.push({
      text: `Research finding (${profile.label}): ${f.title} — ${f.summary}`,
      type: 'finding',
      tags: f.tags,
    });
  }
  points.push({
    text: `Plan (${profile.label}): ${plan.rationale}`,
    type: 'plan',
    tags: ['plan', ...profile.keywords],
  });
  return points;
}
