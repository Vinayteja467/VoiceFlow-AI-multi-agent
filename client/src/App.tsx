import { Link, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './AppShell';
import { CommandCenter } from './features/command-center/CommandCenter';
import { Approvals } from './features/approvals/Approvals';
import { HistoryPage } from './features/history/History';
import { MemoryExplorer } from './features/memory/MemoryExplorer';
import { TaskBoard } from './features/tasks/TaskBoard';
import { useUiStore } from './store/uiStore';

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-display text-6xl font-semibold text-ink">404</p>
      <p className="mt-3 text-sm text-muted">That page doesn’t exist.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-brand-400 hover:underline">
        Back to the Command Center
      </Link>
    </div>
  );
}

export default function App() {
  const theme = useUiStore((s) => s.theme);

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="tasks" element={<TaskBoard />} />
          <Route path="memory" element={<MemoryExplorer />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      <Toaster
        theme={theme}
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ className: 'font-sans' }}
      />
    </>
  );
}
