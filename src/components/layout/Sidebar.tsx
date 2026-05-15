import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, LineChart, History, Cpu, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analysis', icon: LineChart, label: 'Analysis' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/model-info', icon: Cpu, label: 'Model Info' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'fixed left-0 top-14 bottom-0 w-56 bg-sidebar border-r border-sidebar-border z-40 transition-transform duration-200',
        'md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <div className="flex items-center justify-between p-4 md:hidden">
          <span className="text-sm font-medium">Menu</span>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 bg-muted/50 rounded-sm">
            <p className="text-xs text-muted-foreground font-mono">System v2.1.0</p>
            <p className="text-xs text-muted-foreground mt-1">ML Model: Active</p>
          </div>
        </div>
      </aside>
    </>
  );
}