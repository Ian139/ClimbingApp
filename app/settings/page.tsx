'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useRoutesStore } from '@/lib/stores/routes-store';
import { useWallsStore } from '@/lib/stores/walls-store';
import { useUserStore } from '@/lib/stores/user-store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const routes = useRoutesStore((state) => state.routes);
  const walls = useWallsStore((state) => state.walls);
  const { user, isAuthenticated, logout, displayName, isModerator, login } = useUserStore();
  const [showClearData, setShowClearData] = useState(false);
  const [showModLogin, setShowModLogin] = useState(false);
  const [modEmail, setModEmail] = useState('');
  const [modPassword, setModPassword] = useState('');
  const [modLoading, setModLoading] = useState(false);
  const [modError, setModError] = useState('');

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    router.push('/');
  };

  const handleModLogin = async () => {
    setModLoading(true);
    setModError('');

    const result = await login(modEmail, modPassword);

    if (result.success) {
      toast.success('Logged in as moderator');
      setShowModLogin(false);
      setModEmail('');
      setModPassword('');
    } else {
      setModError(result.error || 'Login failed');
    }

    setModLoading(false);
  };

  const handleClearData = () => {
    localStorage.removeItem('climbset-routes');
    localStorage.removeItem('climbset-walls');
    localStorage.removeItem('climbset-wall');
    localStorage.removeItem('climbset-draft');
    window.location.reload();
  };

  const handleExportData = () => {
    const data = {
      routes,
      walls,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climbset-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported!');
  };

  return (
    <div className="min-h-dvh bg-background pb-28">
      {/* Header */}
      <header className="px-6 pt-6 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="size-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="px-6 space-y-8">
        {/* Account */}
        <section>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Account</h2>

          {isAuthenticated && user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Log out
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 py-2.5 px-4 rounded-xl bg-muted/50 text-center text-sm font-medium hover:bg-muted transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-center text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Sign Up
              </Link>
            </div>
          )}
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Appearance</h2>
          <div className="flex gap-2">
            {[
              { value: 'light', label: 'Light', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              )},
              { value: 'dark', label: 'Dark', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )},
              { value: 'system', label: 'Auto', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                </svg>
              )},
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-xl transition-all",
                  theme === option.value
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {option.icon}
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Data</h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{routes.length}</span> routes saved
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{walls.length}</span> walls saved
            </p>
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-muted/30 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export Data
            </button>
          </div>
        </section>

        {/* Moderator */}
        {(isModerator || !isAuthenticated) && (
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Admin</h2>
            {isModerator ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="font-medium">Moderator mode active</span>
              </div>
            ) : (
              <button
                onClick={() => setShowModLogin(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Moderator login
              </button>
            )}
          </section>
        )}

        {/* Danger Zone */}
        <section>
          <h2 className="text-xs font-medium text-destructive/70 uppercase tracking-wider mb-4">Danger Zone</h2>
          <button
            onClick={() => setShowClearData(true)}
            className="text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            Clear all local data
          </button>
        </section>

        {/* App Info */}
        <section className="pt-8 pb-4 text-center">
          <p className="text-xs text-muted-foreground">ClimbSet v1.1.2</p>
        </section>
      </main>

      {/* Clear Data Dialog */}
      <Dialog open={showClearData} onOpenChange={setShowClearData}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Data</DialogTitle>
            <DialogDescription>
              This will permanently delete all your routes and walls. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearData(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearData}>
              Clear All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderator Login Dialog */}
      <Dialog open={showModLogin} onOpenChange={setShowModLogin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderator Login</DialogTitle>
            <DialogDescription>
              Sign in with a moderator account to access admin controls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mod-email">Email</Label>
              <Input
                id="mod-email"
                type="email"
                value={modEmail}
                onChange={(e) => setModEmail(e.target.value)}
                placeholder="moderator@example.com"
                disabled={modLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mod-password">Password</Label>
              <Input
                id="mod-password"
                type="password"
                value={modPassword}
                onChange={(e) => setModPassword(e.target.value)}
                placeholder="Enter password"
                disabled={modLoading}
              />
            </div>
            {modError && (
              <p className="text-sm text-destructive">{modError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowModLogin(false);
                setModEmail('');
                setModPassword('');
                setModError('');
              }}
              disabled={modLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleModLogin}
              disabled={modLoading || !modEmail || !modPassword}
            >
              {modLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
