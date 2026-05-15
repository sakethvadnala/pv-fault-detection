import { ReactNode, useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { SystemStatus, FaultType } from '@/types/pv-system';
import { Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Login from '@/pages/Login';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [systemState, setSystemState] = useState({
    status: 'Normal' as SystemStatus,
    currentFault: 'Normal' as FaultType,
    confidence: 0.98,
    lastUpdated: new Date().toISOString(),
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setTimeout(() => {
        setLoading(false);
      }, 3000); // 3 seconds]
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemState(prev => ({ ...prev, lastUpdated: new Date().toISOString() }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Show loading spinner
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-primary/20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-primary/40 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-semibold tracking-tight">PV Fault Detection System</p>
            <p className="text-xs text-muted-foreground font-mono animate-pulse">Initializing systems...</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        status={systemState.status}
        lastUpdated={systemState.lastUpdated}
        onMenuToggle={() => setSidebarOpen(prev => !prev)}
        user={user}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-56 pt-14 min-h-screen">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}