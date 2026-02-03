'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { WallCanvas } from '@/components/wall/WallCanvas';
import { useHolds } from '@/lib/hooks/useHolds';
import { HoldType, HoldSize, Route, V_GRADES, HOLD_COLORS, HOLD_TYPE_CYCLE, HOLD_BORDER_WIDTH } from '@/lib/types';
import { nanoid } from 'nanoid';
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

// Wrapper component with Suspense for useSearchParams
export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoadingFallback />}>
      <EditorContent />
    </Suspense>
  );
}

function EditorLoadingFallback() {
  return (
    <div className="h-dvh bg-background md:bg-zinc-950 flex items-center justify-center">
      <div className="text-muted-foreground">Loading editor...</div>
    </div>
  );
}

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editRouteId = searchParams.get('edit');

  const {
    holds,
    selectedType,
    selectedSize,
    showSequence,
    setSelectedType,
    setSelectedSize,
    addHold,
    removeHold,
    handleTap,
    clearHolds,
    clearDraft,
    setAllHolds,
    undo,
    redo,
    canUndo,
    canRedo,
    toggleSequenceVisibility,
  } = useHolds();

  const { selectedWall } = useWallStore();
  const { routes, addRoute, updateRoute } = useRoutesStore();
  const { userId, displayName, isModerator } = useUserStore();
  const wall = selectedWall?.id === 'all-walls' ? DEFAULT_WALL : (selectedWall || DEFAULT_WALL);

  // Edit mode state
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const isEditMode = !!editRouteId;

  // Check if user can edit a route
  const canEditRoute = useCallback((route: Route) => {
    return isModerator || route.user_id === userId || route.user_id === 'local-user';
  }, [isModerator, userId]);

  // Load route data when in edit mode
  useEffect(() => {
    if (editRouteId && routes.length > 0) {
      const route = routes.find(r => r.id === editRouteId);
      if (route) {
        if (!canEditRoute(route)) {
          toast.error('You do not have permission to edit this route');
          router.push('/');
          return;
        }
        setEditingRoute(route);
        setAllHolds(route.holds);
        // Clear localStorage draft to avoid conflicts
        if (typeof window !== 'undefined') {
          localStorage.removeItem('climbset-draft');
        }
      } else {
        toast.error('Route not found');
        router.push('/');
      }
    }
  }, [editRouteId, routes, router, setAllHolds, canEditRoute]);

  // Save state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeGrade, setRouteGrade] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pre-populate form when editing
  useEffect(() => {
    if (editingRoute) {
      setRouteName(editingRoute.name);
      setRouteGrade(editingRoute.grade_v || '');
    }
  }, [editingRoute]);

  // Handle save
  const handleSave = async () => {
    if (!routeName.trim()) {
      setSaveError('Please enter a route name');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (isEditMode && editingRoute) {
        // Update existing route
        await updateRoute(editingRoute.id, {
          name: routeName.trim(),
          grade_v: routeGrade && routeGrade !== 'ungraded' ? routeGrade : undefined,
          holds,
        });
        toast.success('Route updated!');
        router.push('/');
      } else {
        // Create new route
        const route: Route = {
          id: crypto.randomUUID(),
          user_id: userId || 'local-user',
          user_name: displayName || 'Anonymous',
          wall_id: wall.id,
          wall_image_url: wall.image_url, // Snapshot wall image at creation time
          name: routeName.trim(),
          grade_v: routeGrade && routeGrade !== 'ungraded' ? routeGrade : undefined,
          holds,
          is_public: false,
          view_count: 0,
          share_token: nanoid(10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Save to local store
        addRoute(route);
        toast.success('Route saved!');
      }

      // Clear the draft from localStorage
      clearDraft();
      // Close dialog and reset form
      setShowSaveDialog(false);
      setRouteName('');
      setRouteGrade('');
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
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedType, undo, redo]);

  const holdTypes: HoldType[] = ['start', 'hand', 'foot', 'finish'];

  // Size as a numeric value for slider (0-100 maps to small/medium/large)
  const sizeToValue = (size: HoldSize): number => {
    switch (size) {
      case 'small': return 0;
      case 'medium': return 50;
      case 'large': return 100;
    }
  };

  const valueToSize = (value: number): HoldSize => {
    if (value < 33) return 'small';
    if (value < 67) return 'medium';
    return 'large';
  };

  const [sizeValue, setSizeValue] = useState(sizeToValue(selectedSize));

  // Sync sizeValue when selectedSize changes externally
  useEffect(() => {
    setSizeValue(sizeToValue(selectedSize));
  }, [selectedSize]);

  // Update size when slider value changes
  const handleSizeChange = (value: number) => {
    setSizeValue(value);
    const newSize = valueToSize(value);
    if (newSize !== selectedSize) {
      setSelectedSize(newSize);
    }
  };

  // Mobile drag state
  const [isDraggingSize, setIsDraggingSize] = useState(false);
  const dragStartRef = useRef<{ x: number; startValue: number } | null>(null);

  const handleSizeDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSize(true);
    dragStartRef.current = { x: e.clientX, startValue: sizeValue };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSizeDragMove = (e: React.PointerEvent) => {
    if (!isDraggingSize || !dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    // 100px drag = full range
    const newValue = Math.max(0, Math.min(100, dragStartRef.current.startValue + deltaX * 1.5));
    handleSizeChange(newValue);
  };

  const handleSizeDragEnd = (e: React.PointerEvent) => {
    setIsDraggingSize(false);
    dragStartRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Size preview circle size and border width
  const previewSize = 12 + (sizeValue / 100) * 20; // 12-32px range
  const previewBorderWidth = HOLD_BORDER_WIDTH[selectedSize];

  // Cycle to next hold type (for mobile indicator tap)
  const cycleHoldType = () => {
    const currentIndex = HOLD_TYPE_CYCLE.indexOf(selectedType);
    const nextIndex = (currentIndex + 1) % HOLD_TYPE_CYCLE.length;
    setSelectedType(HOLD_TYPE_CYCLE[nextIndex]);
  };

  const handleSaveDialogChange = (open: boolean) => {
    setShowSaveDialog(open);

    if (open) {
      if (isEditMode && editingRoute) {
        setRouteName(editingRoute.name);
        setRouteGrade(editingRoute.grade_v || '');
      }
      return;
    }

    if (!isEditMode) {
      setRouteName('');
      setRouteGrade('');
    }

    setSaveError(null);
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
              {isEditMode ? 'Update' : 'Save'}
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
        <div className="md:hidden mb-[72px]">
          {/* Container with matching background */}
          <div className="bg-background/95 backdrop-blur-xl border-t border-border/30 px-6 pt-4 pb-4">
            <div className="flex items-center justify-between gap-2">
              {/* Hold type selector button */}
              <button
                onClick={cycleHoldType}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border active:scale-95 transition-all"
                style={{
                  backgroundColor: `${HOLD_COLORS[selectedType]}15`,
                  borderColor: `${HOLD_COLORS[selectedType]}40`,
                }}
              >
                <div
                  className="size-4 rounded-full shadow-sm"
                  style={{ backgroundColor: HOLD_COLORS[selectedType] }}
                />
                <span className="text-sm font-semibold text-foreground capitalize">
                  {selectedType}
                </span>
                <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
              </button>

              {/* Size selector - drag to resize on mobile */}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all touch-none select-none",
                  isDraggingSize
                    ? "bg-primary/10 border-primary/40 scale-105"
                    : "bg-muted/50 border-transparent"
                )}
                onPointerDown={handleSizeDragStart}
                onPointerMove={handleSizeDragMove}
                onPointerUp={handleSizeDragEnd}
                onPointerCancel={handleSizeDragEnd}
              >
                <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: previewSize,
                    height: previewSize,
                    border: `${previewBorderWidth}px solid ${HOLD_COLORS[selectedType]}`,
                    backgroundColor: `${HOLD_COLORS[selectedType]}30`,
                    boxShadow: isDraggingSize ? `0 0 8px ${HOLD_COLORS[selectedType]}66` : undefined,
                  }}
                />
                <span className="text-xs text-muted-foreground capitalize w-12">{selectedSize}</span>
              </div>

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

            {/* Size selector - slider on desktop */}
            <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2">
              <div
                className="shrink-0 rounded-full transition-all"
                style={{
                  width: previewSize,
                  height: previewSize,
                  border: `${previewBorderWidth}px solid ${HOLD_COLORS[selectedType]}`,
                  backgroundColor: `${HOLD_COLORS[selectedType]}30`,
                }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sizeValue}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                className="w-20 h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                title={`Size: ${selectedSize}`}
              />
              <span className="text-xs text-zinc-400 w-10 capitalize">{selectedSize}</span>
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
      <Dialog open={showSaveDialog} onOpenChange={handleSaveDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Update Route' : 'Save Route'}</DialogTitle>
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
              onClick={() => handleSaveDialogChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !routeName.trim()}
            >
              {isSaving ? 'Saving...' : isEditMode ? 'Update Route' : 'Save Route'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
