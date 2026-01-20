'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WallCanvas } from '@/components/wall/WallCanvas';
import { useHolds } from '@/lib/hooks/useHolds';
import { HoldType, Route, V_GRADES, HOLD_COLORS, HOLD_TYPE_CYCLE } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWallStore } from '@/lib/stores/wall-store';
import { DEFAULT_WALL } from '@/lib/stores/walls-store';
import { useRoutesStore } from '@/lib/stores/routes-store';
import { useUserStore } from '@/lib/stores/user-store';

export default function EditorPage() {
  const {
    holds,
    selectedType,
    showSequence,
    setSelectedType,
    addHold,
    removeHold,
    handleTap,
    clearHolds,
    clearDraft,
    undo,
    redo,
    canUndo,
    canRedo,
    toggleSequenceVisibility,
  } = useHolds();

  const { selectedWall } = useWallStore();
  const addRoute = useRoutesStore((state) => state.addRoute);
  const { userId, displayName } = useUserStore();
  const wall = selectedWall || DEFAULT_WALL;

  // Save state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeGrade, setRouteGrade] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Handle save
  const handleSave = async () => {
    if (!routeName.trim()) {
      setSaveError('Please enter a route name');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Create route object
      const route: Route = {
        id: crypto.randomUUID(),
        user_id: userId || 'local-user',
        user_name: displayName || 'Anonymous',
        wall_id: wall.id,
        name: routeName.trim(),
        grade_v: routeGrade && routeGrade !== 'ungraded' ? routeGrade : undefined,
        holds,
        is_public: false,
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save to local store
      addRoute(route);

      // Clear the draft from localStorage
      clearDraft();
      // Close dialog and reset form
      setShowSaveDialog(false);
      setRouteName('');
      setRouteGrade('');
      // Show success feedback
      toast.success('Route saved!');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') setSelectedType('start');
      if (e.key === '2') setSelectedType('hand');
      if (e.key === '3') setSelectedType('foot');
      if (e.key === '4') setSelectedType('finish');

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedType, undo, redo]);

  const holdTypes: HoldType[] = ['start', 'hand', 'foot', 'finish'];

  // Cycle to next hold type (for mobile indicator tap)
  const cycleHoldType = () => {
    const currentIndex = HOLD_TYPE_CYCLE.indexOf(selectedType);
    const nextIndex = (currentIndex + 1) % HOLD_TYPE_CYCLE.length;
    setSelectedType(HOLD_TYPE_CYCLE[nextIndex]);
  };

  return (
    <div className="h-dvh bg-background md:bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header - minimal, floating feel */}
      <header className="absolute top-0 left-0 right-0 z-50 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Back to home"
            className="size-10 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
              className="size-10 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-30 disabled:hover:bg-black/50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
              className="size-10 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-30 disabled:hover:bg-black/50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={holds.length === 0}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Save
            </button>
          </div>
        </div>
      </header>

      {/* Wall - full screen */}
      <div className="flex-1">
        <WallCanvas
          wallImageUrl={wall.image_url}
          holds={holds}
          showSequence={showSequence}
          onAddHold={addHold}
          onRemoveHold={removeHold}
          onTap={handleTap}
        />
      </div>

      {/* Bottom Controls - clean, modern */}
      <div className="absolute bottom-0 left-0 right-0 z-50">
        {/* Mobile: Bottom panel raised above nav */}
        <div className="md:hidden mb-16">
          {/* Container with matching background */}
          <div className="bg-background/95 backdrop-blur-xl border-t border-border/30 px-6 pt-4 pb-4">
            <div className="flex items-center justify-between">
              {/* Hold type selector button */}
              <button
                onClick={cycleHoldType}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border active:scale-95 transition-all"
                style={{
                  backgroundColor: `${HOLD_COLORS[selectedType]}15`,
                  borderColor: `${HOLD_COLORS[selectedType]}40`,
                }}
              >
                <div
                  className="size-5 rounded-full shadow-sm"
                  style={{ backgroundColor: HOLD_COLORS[selectedType] }}
                />
                <span className="text-base font-semibold text-foreground capitalize">
                  {selectedType}
                </span>
                <svg className="w-4 h-4 text-muted-foreground ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
              </button>

              {/* Hold count */}
              <span className="text-sm font-medium text-muted-foreground">
                {holds.length} hold{holds.length !== 1 ? 's' : ''}
              </span>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleSequenceVisibility(!showSequence)}
                  aria-label="Toggle sequence numbers"
                  className={cn(
                    'size-10 rounded-lg flex items-center justify-center transition-all',
                    showSequence
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
                  </svg>
                </button>

                <button
                  onClick={clearHolds}
                  aria-label="Clear all holds"
                  className="size-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Full control bar with hold type pills */}
        <div className="hidden md:block p-4 pb-safe">
          <div className="relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
              <span className="text-xs font-medium text-zinc-300 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-lg shadow-lg">
                {holds.length} holds
              </span>
            </div>

            <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl p-1.5 flex items-center gap-1 shadow-xl">
            {/* Hold type pills */}
            <div className="flex-1 flex gap-1">
              {holdTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all border-2',
                    selectedType === type
                      ? 'bg-zinc-700/80 shadow-inner'
                      : 'border-transparent hover:bg-zinc-800/80'
                  )}
                  style={selectedType === type ? {
                    borderColor: HOLD_COLORS[type],
                    boxShadow: `0 0 12px ${HOLD_COLORS[type]}66`,
                  } : undefined}
                >
                  <div
                    className={cn(
                      'size-4 rounded-full shadow-sm transition-transform',
                      selectedType === type && 'scale-110'
                    )}
                    style={{ backgroundColor: HOLD_COLORS[type] }}
                  />
                  <span className={cn(
                    'text-xs font-medium capitalize',
                    selectedType === type ? 'text-white' : 'text-zinc-400'
                  )}>
                    {type}
                  </span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-zinc-700 mx-1" />

            {/* More actions */}
            <button
              onClick={() => toggleSequenceVisibility(!showSequence)}
              aria-label="Toggle sequence numbers"
              className={cn(
                'size-10 rounded-lg flex items-center justify-center transition-colors',
                showSequence
                  ? 'bg-primary/20 text-primary'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
              </svg>
            </button>

            <button
              onClick={clearHolds}
              aria-label="Clear all holds"
              className="size-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Route</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="route-name">Route Name</Label>
              <Input
                id="route-name"
                type="text"
                value={routeName}
                onChange={(e) => {
                  setRouteName(e.target.value);
                  setSaveError(null);
                }}
                placeholder="e.g., Crimpy Corner"
                disabled={isSaving}
                autoFocus
              />
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="route-grade">Grade (Your Suggestion)</Label>
              <Select value={routeGrade} onValueChange={setRouteGrade}>
                <SelectTrigger id="route-grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ungraded">Ungraded</SelectItem>
                  {V_GRADES.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This is your suggested grade as the setter
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false);
                setRouteName('');
                setRouteGrade('');
                setSaveError(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !routeName.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Route'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
