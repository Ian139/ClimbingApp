'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'motion/react';
import { useWallStore } from '@/lib/stores/wall-store';
import { useWallsStore } from '@/lib/stores/walls-store';
import { useRoutesStore } from '@/lib/stores/routes-store';
import { useUserStore } from '@/lib/stores/user-store';
import { useTransitionStore } from '@/lib/stores/transition-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Wall, Route, Ascent } from '@/lib/types';
import { HOLD_COLORS, V_GRADES } from '@/lib/types';
import { RouteViewer } from '@/components/wall/RouteViewer';
import { Textarea } from '@/components/ui/textarea';

// Sort options
type SortOption = 'newest' | 'oldest' | 'name' | 'grade-asc' | 'grade-desc' | 'rating';

// Grade to numeric value for sorting
const gradeToNumber = (grade?: string): number => {
  if (!grade) return -1;
  const index = V_GRADES.indexOf(grade);
  return index >= 0 ? index : -1;
};

// Convert numeric grade back to V grade string
const numberToGrade = (num: number): string | undefined => {
  const rounded = Math.round(num);
  if (rounded >= 0 && rounded < V_GRADES.length) {
    return V_GRADES[rounded];
  }
  return undefined;
};

// Calculate display grade: half setter's grade + average of user grades, then round
const calculateDisplayGrade = (setterGrade?: string, ascents?: { grade_v?: string }[]): string | undefined => {
  const setterNum = gradeToNumber(setterGrade);

  // Get user grades from ascents
  const userGrades = (ascents || [])
    .map(a => gradeToNumber(a.grade_v))
    .filter(g => g >= 0);

  // If no setter grade and no user grades, return undefined
  if (setterNum < 0 && userGrades.length === 0) {
    return undefined;
  }

  // If only setter grade exists, return it
  if (setterNum >= 0 && userGrades.length === 0) {
    return setterGrade;
  }

  // If only user grades exist, return their average
  if (setterNum < 0 && userGrades.length > 0) {
    const avgUser = userGrades.reduce((sum, g) => sum + g, 0) / userGrades.length;
    return numberToGrade(avgUser);
  }

  // Both exist: half setter + half average user
  const avgUser = userGrades.reduce((sum, g) => sum + g, 0) / userGrades.length;
  const combined = (setterNum * 0.5) + (avgUser * 0.5);
  return numberToGrade(combined);
};

export default function Home() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { selectedWall, setSelectedWall } = useWallStore();
  const { walls, addWall, deleteWall, fetchWalls } = useWallsStore();
  const { routes, deleteRoute, addAscent, hasUserClimbed, fetchRoutes, isLoading: routesLoading } = useRoutesStore();
  const { userId, displayName, isModerator } = useUserStore();
  const startTransition = useTransitionStore((state) => state.startTransition);
  const [mounted, setMounted] = useState(false);

  // Wall picker state
  const [showWallPicker, setShowWallPicker] = useState(false);
  const [showAddWall, setShowAddWall] = useState(false);
  const [wallName, setWallName] = useState('');
  const [wallImage, setWallImage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Route delete state
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);

  // Wall delete state
  const [wallToDelete, setWallToDelete] = useState<Wall | null>(null);

  // Route viewer state
  const [routeToView, setRouteToView] = useState<Route | null>(null);

  // Log climb state
  const [routeToLog, setRouteToLog] = useState<Route | null>(null);
  const [logGrade, setLogGrade] = useState<string>('');
  const [logRating, setLogRating] = useState<number>(0);
  const [logNotes, setLogNotes] = useState('');
  const [logFlashed, setLogFlashed] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  // Search, sort, and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  // Flipped cards state
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const toggleCardFlip = (routeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routeId)) {
        newSet.delete(routeId);
      } else {
        newSet.add(routeId);
      }
      return newSet;
    });
  };

  // Fetch data from Supabase on mount
  useEffect(() => {
    setMounted(true);

    // Fetch walls and routes from Supabase
    const loadData = async () => {
      await fetchWalls();
      await fetchRoutes();
    };
    loadData();
  }, [fetchWalls, fetchRoutes]);

  // Auto-select first wall if none selected
  useEffect(() => {
    if (!selectedWall && walls.length > 0) {
      setSelectedWall(walls[0]);
    }
  }, [selectedWall, walls, setSelectedWall]);

  // Get routes for selected wall with search, sort, and filter
  const wallRoutes = useMemo(() => {
    if (!selectedWall) return [];

    let filtered = routes.filter((r) => r.wall_id === selectedWall.id);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.user_name?.toLowerCase().includes(query)) ||
        (r.grade_v?.toLowerCase().includes(query))
      );
    }

    // Grade filter
    if (filterGrade !== 'all') {
      filtered = filtered.filter(r => r.grade_v === filterGrade);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'grade-asc':
          return gradeToNumber(a.grade_v) - gradeToNumber(b.grade_v);
        case 'grade-desc':
          return gradeToNumber(b.grade_v) - gradeToNumber(a.grade_v);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [selectedWall, routes, searchQuery, sortBy, filterGrade]);

  // Get unique grades from wall routes for filter dropdown
  const availableGrades = useMemo(() => {
    if (!selectedWall) return [];
    const grades = routes
      .filter(r => r.wall_id === selectedWall.id && r.grade_v)
      .map(r => r.grade_v!)
      .filter((grade, index, self) => self.indexOf(grade) === index)
      .sort((a, b) => gradeToNumber(a) - gradeToNumber(b));
    return grades;
  }, [selectedWall, routes]);

  // Check if user can delete a route (moderators can delete any route)
  const canDeleteRoute = (route: Route) => {
    return isModerator || route.user_id === userId || route.user_id === 'local-user';
  };

  // Check if user can delete a wall (moderators can delete any wall, except default)
  const canDeleteWall = (wall: Wall) => {
    if (wall.id === 'default-wall') return false; // Never delete default wall
    return isModerator || wall.user_id === userId || wall.user_id === 'local-user';
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setWallImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle add wall
  const handleAddWall = () => {
    if (!wallName.trim() || !wallImage) return;

    setIsAdding(true);

    const newWall: Wall = {
      id: crypto.randomUUID(),
      user_id: userId || 'local-user',
      name: wallName.trim(),
      image_url: wallImage,
      image_width: 1920,
      image_height: 1080,
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addWall(newWall);
    setSelectedWall(newWall);
    setShowAddWall(false);
    setShowWallPicker(false);
    setWallName('');
    setWallImage(null);
    setIsAdding(false);
    toast.success('Wall added!');
  };

  // Navigate to editor with transition
  const handleNewRoute = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    startTransition(rect.left + rect.width / 2, rect.top + rect.height / 2);
    setTimeout(() => router.push('/editor'), 100);
  };

  // Open log climb dialog
  const openLogDialog = (route: Route, e: React.MouseEvent) => {
    e.stopPropagation();
    setRouteToLog(route);
    setLogGrade(route.grade_v || '');
    setLogRating(0);
    setLogNotes('');
    setLogFlashed(false);
  };

  // Handle log climb submission
  const handleLogClimb = () => {
    if (!routeToLog) return;

    setIsLogging(true);

    const ascent: Ascent = {
      id: crypto.randomUUID(),
      route_id: routeToLog.id,
      user_id: userId || 'local-user',
      user_name: displayName || 'Anonymous',
      grade_v: logGrade || undefined,
      rating: logRating > 0 ? logRating : undefined,
      notes: logNotes.trim() || undefined,
      flashed: logFlashed,
      created_at: new Date().toISOString(),
    };

    addAscent(routeToLog.id, ascent);

    // Reset and close
    setRouteToLog(null);
    setLogGrade('');
    setLogRating(0);
    setLogNotes('');
    setLogFlashed(false);
    setIsLogging(false);
    toast.success('Climb logged!');
  };

  // Interactive star rating component for input
  const StarRatingInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? 0 : star)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <svg
              className={cn(
                'w-6 h-6',
                star <= value ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'
              )}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  // Star rating display
  const StarRating = ({ rating }: { rating?: number }) => {
    const stars = rating || 0;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={cn(
              'w-3.5 h-3.5',
              star <= stars ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/20'
            )}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ))}
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div className="min-h-dvh bg-background pb-28">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold tracking-tight">climbset</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle dark mode"
              className="size-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5 dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
              <svg className="w-5 h-5 hidden dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </button>
            <Link
              href="/settings"
              aria-label="Settings"
              className="size-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Wall Selector */}
        <button
          onClick={() => setShowWallPicker(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
        >
          {selectedWall ? (
            <>
              <div className="size-12 rounded-lg bg-muted overflow-hidden shrink-0">
                <img
                  src={selectedWall.image_url}
                  alt={selectedWall.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium truncate">{selectedWall.name}</p>
                <p className="text-sm text-muted-foreground">{wallRoutes.length} routes</p>
              </div>
            </>
          ) : (
            <div className="flex-1 text-left">
              <p className="font-medium">Select a wall</p>
              <p className="text-sm text-muted-foreground">Tap to choose</p>
            </div>
          )}
          <svg className="w-5 h-5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </button>
      </header>

      {/* Routes List */}
      <main className="px-4 mt-2">
        {!selectedWall ? (
          <div className="py-16 text-center">
            <div className="size-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">No wall selected</h3>
            <p className="text-sm text-muted-foreground mb-4">Choose a wall to see routes</p>
            <Button onClick={() => setShowWallPicker(true)}>Select Wall</Button>
          </div>
        ) : (
          <>
            {/* Search and Filter Bar */}
            <div className="mb-4 space-y-3">
              {/* Search Input */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <Input
                  type="text"
                  placeholder="Search routes, setters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Sort and Filter Row */}
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="grade-asc">Grade (Easiest)</SelectItem>
                    <SelectItem value="grade-desc">Grade (Hardest)</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Filter grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {availableGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchQuery || filterGrade !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterGrade('all');
                    }}
                    className="h-9 px-3 rounded-md bg-muted text-muted-foreground hover:text-foreground text-sm font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Results count */}
              {(searchQuery || filterGrade !== 'all') && (
                <p className="text-sm text-muted-foreground">
                  {wallRoutes.length} route{wallRoutes.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>

            {/* Loading state */}
            {routesLoading && wallRoutes.length === 0 ? (
              <div className="py-16 text-center">
                <div className="size-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-muted-foreground animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-1">Loading routes...</h3>
                <p className="text-sm text-muted-foreground">Fetching climbs from the cloud</p>
              </div>
            ) : wallRoutes.length === 0 && (searchQuery || filterGrade !== 'all') ? (
              <div className="py-12 text-center">
                <div className="size-14 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-1">No routes found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : wallRoutes.length === 0 ? (
              <div className="py-16 text-center">
                <div className="size-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-1">No routes yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first route on {selectedWall.name}</p>
                <Button onClick={handleNewRoute}>Create Route</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {wallRoutes.map((route, index) => {
                  const showInfo = flippedCards.has(route.id);
                  const ascents = route.ascents || [];
                  const avgRating = ascents.length > 0
                    ? ascents.reduce((sum, a) => sum + (a.rating || 0), 0) / ascents.filter(a => a.rating).length || route.rating || 0
                    : route.rating || 0;
                  const displayGrade = calculateDisplayGrade(route.grade_v, ascents);

                  return (
                    <motion.div
                      key={route.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        {!showInfo ? (
                          <motion.div
                            key="front"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setRouteToView(route)}
                            className="p-4 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              {/* Grade Badge - Left side */}
                              <div className="shrink-0">
                                <div className={cn(
                                  "size-12 rounded-xl flex items-center justify-center font-bold text-sm",
                                  displayGrade
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {displayGrade || '?'}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 py-0.5">
                                <h3 className="font-semibold truncate">{route.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                    {route.user_name || 'Anonymous'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="flex gap-0.5">
                                      {route.holds.slice(0, 3).map((hold, i) => (
                                        <div
                                          key={i}
                                          className="size-2 rounded-full"
                                          style={{ backgroundColor: HOLD_COLORS[hold.type] }}
                                        />
                                      ))}
                                    </div>
                                    {route.holds.length} holds
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                  {avgRating > 0 && <StarRating rating={Math.round(avgRating)} />}
                                  {ascents.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {ascents.length} ascent{ascents.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-1 shrink-0">
                                <button
                                  onClick={(e) => openLogDialog(route, e)}
                                  aria-label="Log climb"
                                  className={cn(
                                    "size-9 rounded-lg flex items-center justify-center transition-colors",
                                    hasUserClimbed(route.id, userId || 'local-user')
                                      ? "text-secondary bg-secondary/10"
                                      : "text-muted-foreground hover:text-secondary hover:bg-secondary/10"
                                  )}
                                >
                                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => toggleCardFlip(route.id, e)}
                                  aria-label="View info"
                                  className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                  </svg>
                                </button>
                                {canDeleteRoute(route) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRouteToDelete(route);
                                    }}
                                    aria-label="Delete route"
                                    className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="back"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="p-4"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold truncate">{route.name}</h3>
                              <button
                                onClick={(e) => toggleCardFlip(route.id, e)}
                                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-muted-foreground text-xs mb-1">Grade</p>
                                <p className="font-bold text-primary text-lg">{displayGrade || 'Ungraded'}</p>
                                {route.grade_v && displayGrade !== route.grade_v && (
                                  <p className="text-xs text-muted-foreground mt-0.5">Setter: {route.grade_v}</p>
                                )}
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-muted-foreground text-xs mb-1">Rating</p>
                                <div className="flex items-center gap-1.5">
                                  <StarRating rating={Math.round(avgRating)} />
                                  {avgRating > 0 && <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>}
                                </div>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-muted-foreground text-xs mb-1">Setter</p>
                                <p className="font-medium truncate">{route.user_name || 'Anonymous'}</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-muted-foreground text-xs mb-1">Ascents</p>
                                <p className="font-bold text-lg">{ascents.length}</p>
                              </div>
                            </div>

                            {ascents.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-xs text-muted-foreground mb-2">Recent climbers</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {ascents.slice(0, 5).map((a, i) => (
                                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded-md">
                                      {a.user_name || 'Anonymous'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button */}
      {selectedWall && (
        <div className="fixed bottom-6 right-4 z-40">
          <button
            onClick={handleNewRoute}
            className="size-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      )}

      {/* Wall Picker Dialog */}
      <Dialog open={showWallPicker} onOpenChange={setShowWallPicker}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Wall</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            {walls.map((wall) => {
              const routeCount = routes.filter((r) => r.wall_id === wall.id).length;
              const isSelected = selectedWall?.id === wall.id;
              const canDelete = canDeleteWall(wall);

              return (
                <div
                  key={wall.id}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <button
                    onClick={() => {
                      setSelectedWall(wall);
                      setShowWallPicker(false);
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="size-14 rounded-lg bg-muted overflow-hidden shrink-0">
                      <img
                        src={wall.image_url}
                        alt={wall.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{wall.name}</p>
                      <p className="text-sm text-muted-foreground">{routeCount} routes</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWallToDelete(wall);
                        }}
                        aria-label="Delete wall"
                        className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add new wall button */}
            <button
              onClick={() => {
                setShowWallPicker(false);
                setShowAddWall(true);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="size-14 rounded-lg bg-muted flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="font-medium">Add new wall</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Wall Dialog */}
      <Dialog open={showAddWall} onOpenChange={setShowAddWall}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Wall</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wall-name">Wall Name</Label>
              <Input
                id="wall-name"
                type="text"
                value={wallName}
                onChange={(e) => setWallName(e.target.value)}
                placeholder="e.g., Garage Wall"
                disabled={isAdding}
              />
            </div>

            <div className="space-y-2">
              <Label>Wall Photo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {wallImage ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-video rounded-xl overflow-hidden cursor-pointer"
                >
                  <img
                    src={wallImage}
                    alt="Wall preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium">Change photo</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span className="text-sm">Tap to add photo</span>
                </button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddWall(false);
                setWallName('');
                setWallImage(null);
              }}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddWall}
              disabled={isAdding || !wallName.trim() || !wallImage}
            >
              {isAdding ? 'Adding...' : 'Add Wall'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Route Dialog */}
      <Dialog open={!!routeToDelete} onOpenChange={() => setRouteToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Route</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{routeToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (routeToDelete) {
                  deleteRoute(routeToDelete.id);
                  toast.success('Route deleted');
                  setRouteToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Wall Dialog */}
      <Dialog open={!!wallToDelete} onOpenChange={() => setWallToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Wall</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{wallToDelete?.name}"? All routes on this wall will remain but will need to be reassigned. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWallToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (wallToDelete) {
                  // If this was the selected wall, select default wall
                  if (selectedWall?.id === wallToDelete.id) {
                    const defaultWall = walls.find(w => w.id === 'default-wall');
                    if (defaultWall) setSelectedWall(defaultWall);
                  }
                  deleteWall(wallToDelete.id);
                  toast.success('Wall deleted');
                  setWallToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route Viewer Dialog */}
      <Dialog open={!!routeToView} onOpenChange={() => setRouteToView(null)}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden">
          {routeToView && selectedWall && (
            <RouteViewer
              wallImageUrl={selectedWall.image_url}
              holds={routeToView.holds}
              routeName={routeToView.name}
              grade={calculateDisplayGrade(routeToView.grade_v, routeToView.ascents)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Log Climb Dialog */}
      <Dialog open={!!routeToLog} onOpenChange={() => setRouteToLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Climb</DialogTitle>
            <DialogDescription>
              Record your ascent of "{routeToLog?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Suggested Grade */}
            <div className="space-y-2">
              <Label htmlFor="log-grade">Your Grade Suggestion</Label>
              <Select value={logGrade} onValueChange={setLogGrade}>
                <SelectTrigger id="log-grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {V_GRADES.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {routeToLog?.grade_v && (
                <p className="text-xs text-muted-foreground">
                  Setter's grade: {routeToLog.grade_v}
                </p>
              )}
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRatingInput value={logRating} onChange={setLogRating} />
            </div>

            {/* Flash Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="log-flash">Flashed it?</Label>
                <p className="text-xs text-muted-foreground">Sent on your first try</p>
              </div>
              <button
                type="button"
                onClick={() => setLogFlashed(!logFlashed)}
                className={cn(
                  "size-10 rounded-full flex items-center justify-center transition-colors",
                  logFlashed
                    ? "bg-yellow-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="log-notes">Notes (optional)</Label>
              <Textarea
                id="log-notes"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Any beta or thoughts about the climb..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setRouteToLog(null)}
              disabled={isLogging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogClimb}
              disabled={isLogging}
              className="bg-secondary hover:bg-secondary/90"
            >
              {isLogging ? 'Logging...' : 'Log Climb'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
