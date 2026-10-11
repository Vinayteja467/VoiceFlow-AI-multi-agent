import {
  Brain,
  History,
  LayoutDashboard,
  ListTodo,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Command Center',
    icon: LayoutDashboard,
    description: 'Speak or type a request and watch the agents work',
    end: true,
  },
  {
    to: '/tasks',
    label: 'Task Board',
    icon: ListTodo,
    description: 'Kanban of tasks produced by the Task agent',
  },
  {
    to: '/memory',
    label: 'Memory Explorer',
    icon: Brain,
    description: 'Browse the shared Qdrant vector memory',
  },
  {
    to: '/history',
    label: 'History',
    icon: History,
    description: 'Replay past runs and their timelines',
  },
  {
    to: '/approvals',
    label: 'Approvals',
    icon: ShieldCheck,
    description: 'Human gate for queued external actions',
  },
];
