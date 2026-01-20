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
    // Clear localStorage
    localStorage.removeItem('climbset-routes');
    localStorage.removeItem('climbset-walls');
    localStorage.removeItem('climbset-wall');
    localStorage.removeItem('climbset-draft');

    // Reload to reset stores
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
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="size-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="px-4 space-y-5">
        {/* Account */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">Account</h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border shadow-sm">
            {isAuthenticated && user ? (
              <>
                <div className="p-4">
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
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-secondary flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                    </div>
                    <span className="font-medium">Log Out</span>
                  </div>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-secondary flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                    </div>
                    <span className="font-medium">Log In</span>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                      </svg>
                    </div>
                    <span className="font-medium">Create Account</span>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">Appearance</h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border shadow-sm">
            <button
              onClick={() => setTheme('light')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-secondary flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                </div>
                <span className="font-medium">Light</span>
              </div>
              {theme === 'light' && (
                <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-secondary flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                </div>
                <span className="font-medium">Dark</span>
              </div>
              {theme === 'dark' && (
                <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
            </button>
            <button
              onClick={() => setTheme('system')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-secondary flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                  </svg>
                </div>
                <span className="font-medium">System</span>
              </div>
              {theme === 'system' && (
                <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">Data</h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border shadow-sm">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">Routes</p>
                <p className="text-sm text-muted-foreground">{routes.length} saved</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">Walls</p>
                <p className="text-sm text-muted-foreground">{walls.length} saved</p>
              </div>
            </div>
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-secondary flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <span className="font-medium">Export Data</span>
              </div>
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">Danger Zone</h2>
          <div className="bg-card rounded-xl border border-destructive/40 divide-y divide-border shadow-sm">
            {/* Moderator Login */}
            {!isModerator && (
              <button
                onClick={() => setShowModLogin(true)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-amber-600 dark:text-amber-400">Moderator Login</span>
                    <p className="text-sm text-muted-foreground">Access admin controls</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}

            {/* Moderator Status Badge */}
            {isModerator && (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-amber-600 dark:text-amber-400">Moderator Mode Active</span>
                    <p className="text-sm text-muted-foreground">You can delete any route or wall</p>
                  </div>
                </div>
              </div>
            )}

            {/* Clear Data */}
            <button
              onClick={() => setShowClearData(true)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-destructive">Clear All Data</span>
                  <p className="text-sm text-muted-foreground">Delete all routes and walls</p>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* App Info */}
        <section className="pt-4 text-center">
          <p className="text-sm text-muted-foreground">ClimbSet v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">Made for climbers, by climbers</p>
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
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {modLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
