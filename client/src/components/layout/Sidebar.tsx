import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';
import { Tooltip } from '../ui';
import { Logo } from './Logo';
import { NAV_ITEMS } from './nav';

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'hidden shrink-0 flex-col border-r border-line bg-surface-1/50 backdrop-blur-xl lg:flex',
        'transition-[width] duration-300 ease-out-expo',
        collapsed ? 'w-[4.75rem]' : 'w-64',
      )}
    >
      <div className="flex h-16 items-center px-4">
        <Logo compact={collapsed} />
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <Tooltip key={item.to} label={item.label} side="bottom" className="block w-full">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400',
                  isActive
                    ? 'bg-surface-2 text-ink shadow-e1'
                    : 'text-muted hover:bg-surface-2/60 hover:text-ink',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'size-5 shrink-0 transition-colors',
                      isActive ? 'text-brand-400' : 'text-subtle group-hover:text-muted',
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && isActive && (
                    <span className="ml-auto size-1.5 rounded-full bg-brand-400" />
                  )}
                </>
              )}
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="bottom" className="block">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-xs font-medium text-subtle transition-colors hover:bg-surface-2 hover:text-ink',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
