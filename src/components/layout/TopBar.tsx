import { SystemStatus } from '@/types/pv-system';
import { Activity, Zap, Menu, LogOut } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface TopBarProps {
  status: SystemStatus;
  lastUpdated: string;
  onMenuToggle: () => void;
  user: User;
}

export function TopBar({ status, lastUpdated, onMenuToggle, user }: TopBarProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'Normal':
        return { label: 'NORMAL', className: 'badge-normal', dotClass: 'bg-status-normal' };
      case 'Fault':
        return { label: 'FAULT DETECTED', className: 'badge-fault', dotClass: 'bg-status-fault' };
      case 'Warning':
        return { label: 'WARNING', className: 'badge-warning', dotClass: 'bg-status-warning' };
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const statusDisplay = getStatusDisplay();
  const formattedTime = new Date(lastUpdated).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const avatarUrl = user.user_metadata?.avatar_url;
  const userName = user.user_metadata?.full_name || user.email;

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded-sm hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Zap className="h-5 w-5 text-primary" />
        <h1 className="text-sm md:text-base font-semibold tracking-tight">
          PV Fault Detection System
        </h1>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span className="font-mono">{formattedTime}</span>
        </div>

        <div className={statusDisplay.className}>
          <span className={`h-2 w-2 rounded-full ${statusDisplay.dotClass} pulse-indicator`} />
          <span className="font-mono text-xs md:text-sm">{statusDisplay.label}</span>
        </div>

        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="h-7 w-7 rounded-full" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              {userName?.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-sm hover:bg-muted transition-colors text-muted-foreground"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}