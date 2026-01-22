'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { Route, Ascent, Comment } from '@/lib/types';

interface RoutesState {
  routes: Route[];
  isLoading: boolean;
  lastFetched: string | null;

  // Actions
  addRoute: (route: Route) => Promise<void>;
  updateRoute: (id: string, updates: Partial<Route>) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  getRoutesByWall: (wallId: string) => Route[];
  addAscent: (routeId: string, ascent: Ascent) => Promise<void>;
  removeAscent: (routeId: string, ascentId: string) => Promise<void>;
  hasUserClimbed: (routeId: string, userId: string) => boolean;

  // Comment actions
  addComment: (routeId: string, comment: Comment) => Promise<void>;
  deleteComment: (routeId: string, commentId: string) => Promise<void>;

  // View & Like actions
  incrementViewCount: (routeId: string) => Promise<void>;
  toggleLike: (routeId: string, userId: string) => Promise<void>;
  isLikedByUser: (routeId: string, userId: string) => boolean;
  getLikeCount: (routeId: string) => number;

  // Sync actions
  fetchRoutes: () => Promise<void>;
  syncLocalRoutes: () => Promise<void>;
}

export const useRoutesStore = create<RoutesState>()(
  persist(
    (set, get) => ({
      routes: [],
      isLoading: false,
      lastFetched: null,

      // Fetch all public routes from Supabase
      fetchRoutes: async () => {
        set({ isLoading: true });

        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = user?.id || 'local-user';

          // Try fetching routes with related data
          const result = await supabase
            .from('routes')
            .select(`
              *,
              ascents (*),
              comments (*)
            `)
            .eq('is_public', true)
            .order('created_at', { ascending: false });

          if (result.error) {
            // Supabase not configured - keep existing local data
            set({ isLoading: false });
            return;
          }

          // Fetch likes separately to avoid join issues
          const { data: allLikes } = await supabase
            .from('route_likes')
            .select('route_id, user_id');

          // Group likes by route_id
          const likesByRoute: Record<string, string[]> = {};
          (allLikes || []).forEach((like: any) => {
            if (!likesByRoute[like.route_id]) {
              likesByRoute[like.route_id] = [];
            }
            likesByRoute[like.route_id].push(like.user_id);
          });

          const remoteRoutes = result.data?.map(r => {
            const likedBy = likesByRoute[r.id] || [];
            return {
              ...r,
              holds: r.holds || [],
              ascents: r.ascents || [],
              comments: r.comments || [],
              liked_by: likedBy,
              like_count: likedBy.length,
              is_liked: likedBy.includes(currentUserId),
            };
          });

          if (remoteRoutes) {
            // Keep local-only routes
            const existingRoutes = get().routes;
            const localRoutes = existingRoutes.filter(r => r.user_id === 'local-user');

            const mergedRoutes = [
              ...remoteRoutes,
              ...localRoutes.filter(lr => !remoteRoutes.some(rr => rr.id === lr.id))
            ];

            set({
              routes: mergedRoutes,
              lastFetched: new Date().toISOString(),
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          // Network error - keep existing local data
          set({ isLoading: false });
        }
      },

      // Sync local routes to Supabase (for logged-in users)
      syncLocalRoutes: async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const localRoutes = get().routes.filter(r => r.user_id === 'local-user');

        for (const route of localRoutes) {
          const { ascents, wall, user: routeUser, is_liked, like_count, liked_by, comments, ...routeData } = route;

          const { error } = await supabase
            .from('routes')
            .insert({
              ...routeData,
              user_id: user.id,
              is_public: true,
            });

          if (!error) {
            // Update local route with new user_id
            set((state) => ({
              routes: state.routes.map(r =>
                r.id === route.id ? { ...r, user_id: user.id } : r
              )
            }));
          }
        }
      },

      addRoute: async (route) => {
        // Add to local state immediately
        set((state) => ({
          routes: [{ ...route, is_public: true }, ...state.routes]
        }));

        // Always try to save to Supabase (works for anonymous users too)
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          const { ascents, wall, user: routeUser, is_liked, like_count, liked_by, comments, ...routeData } = route;

          const { error } = await supabase
            .from('routes')
            .insert({
              ...routeData,
              user_id: user?.id || null, // null for anonymous users
              is_public: true,
            });

          // Silently handle errors - local state is already updated
        } catch (error) {
          // Supabase not configured or offline - local state is already saved
        }
      },

      updateRoute: async (id, updates) => {
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
          ),
        }));

        // Try to update in Supabase
        try {
          const supabase = createClient();
          const route = get().routes.find(r => r.id === id);

          if (route && route.user_id !== 'local-user') {
            const { ascents, wall, user, is_liked, like_count, liked_by, comments, ...safeUpdates } = updates as any;

            await supabase
              .from('routes')
              .update(safeUpdates)
              .eq('id', id);
          }
        } catch (error) {
          // Supabase not configured or offline - local state is already updated
        }
      },

      deleteRoute: async (id) => {
        const route = get().routes.find(r => r.id === id);

        set((state) => ({
          routes: state.routes.filter((r) => r.id !== id),
        }));

        // Try to delete from Supabase
        try {
          if (route && route.user_id !== 'local-user') {
            const supabase = createClient();
            await supabase
              .from('routes')
              .delete()
              .eq('id', id);
          }
        } catch (error) {
          // Supabase not configured or offline - local state is already updated
        }
      },

      getRoutesByWall: (wallId) =>
        get().routes.filter((r) => r.wall_id === wallId),

      addAscent: async (routeId, ascent) => {
        // Add to local state immediately
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === routeId
              ? {
                  ...r,
                  ascents: [...(r.ascents || []), ascent],
                  updated_at: new Date().toISOString(),
                }
              : r
          ),
        }));

        // Always try to save to Supabase
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          const { error } = await supabase
            .from('ascents')
            .insert({
              id: ascent.id,
              route_id: routeId,
              user_id: user?.id || null,
              user_name: ascent.user_name,
              grade_v: ascent.grade_v,
              rating: ascent.rating,
              notes: ascent.notes,
              flashed: ascent.flashed,
            });

          // Silently handle errors - local state is already updated
        } catch (error) {
          // Supabase not configured or offline - local state is already saved
        }
      },

      removeAscent: async (routeId, ascentId) => {
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === routeId
              ? {
                  ...r,
                  ascents: (r.ascents || []).filter((a) => a.id !== ascentId),
                  updated_at: new Date().toISOString(),
                }
              : r
          ),
        }));

        // Try to delete from Supabase
        try {
          const supabase = createClient();
          await supabase
            .from('ascents')
            .delete()
            .eq('id', ascentId);
        } catch (error) {
          // Supabase not configured or offline - local state is already updated
        }
      },

      hasUserClimbed: (routeId, userId) => {
        const route = get().routes.find((r) => r.id === routeId);
        return route?.ascents?.some((a) => a.user_id === userId) || false;
      },

      addComment: async (routeId, comment) => {
        // Add to local state immediately
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === routeId
              ? {
                  ...r,
                  comments: [...(r.comments || []), comment],
                  updated_at: new Date().toISOString(),
                }
              : r
          ),
        }));

        // Try to save to Supabase
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          const { error } = await supabase
            .from('comments')
            .insert({
              id: comment.id,
              route_id: routeId,
              user_id: user?.id || null,
              user_name: comment.user_name,
              content: comment.content,
              is_beta: comment.is_beta,
            });

          // Silently handle errors - local state is already updated
        } catch (error) {
          // Supabase not configured or offline - local state is already saved
        }
      },

      deleteComment: async (routeId, commentId) => {
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === routeId
              ? {
                  ...r,
                  comments: (r.comments || []).filter((c) => c.id !== commentId),
                  updated_at: new Date().toISOString(),
                }
              : r
          ),
        }));

        // Try to delete from Supabase
        try {
          const supabase = createClient();
          await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);
        } catch (error) {
          // Supabase not configured or offline - local state is already updated
        }
      },

      incrementViewCount: async (routeId) => {
        const route = get().routes.find(r => r.id === routeId);
        const newViewCount = (route?.view_count || 0) + 1;

        // Update local state
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === routeId
              ? { ...r, view_count: newViewCount }
              : r
          ),
        }));

        // Try to update in Supabase
        try {
          const supabase = createClient();
          if (route && route.user_id !== 'local-user') {
            await supabase
              .from('routes')
              .update({ view_count: newViewCount })
              .eq('id', routeId);
          }
        } catch (error) {
          // Supabase not configured - local state is already updated
        }
      },

      toggleLike: async (routeId, localUserId) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const oderId = user?.id || localUserId;

        const route = get().routes.find(r => r.id === routeId);
        if (!route) return;

        // Get current likes array or initialize
        const currentLikes = route.liked_by || [];
        const isCurrentlyLiked = currentLikes.includes(oderId);
        const newLikes = isCurrentlyLiked
          ? currentLikes.filter((id: string) => id !== oderId)
          : [...currentLikes, oderId];

        // Update local state immediately
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === routeId
              ? {
                  ...r,
                  liked_by: newLikes,
                  like_count: newLikes.length,
                  is_liked: !isCurrentlyLiked,
                }
              : r
          ),
        }));

        // Sync to Supabase for authenticated users
        if (user) {
          try {
            if (isCurrentlyLiked) {
              await supabase
                .from('route_likes')
                .delete()
                .eq('route_id', routeId)
                .eq('user_id', user.id);
            } else {
              await supabase
                .from('route_likes')
                .insert({ route_id: routeId, user_id: user.id });
            }
          } catch (error) {
            // Revert on error
            set((state) => ({
              routes: state.routes.map((r) =>
                r.id === routeId
                  ? {
                      ...r,
                      liked_by: currentLikes,
                      like_count: currentLikes.length,
                      is_liked: isCurrentlyLiked,
                    }
                  : r
              ),
            }));
          }
        }
      },

      isLikedByUser: (routeId, oderId) => {
        const route = get().routes.find(r => r.id === routeId);
        if (!route) return false;
        // Check is_liked first (set during fetch with correct user), fallback to liked_by array
        if (route.is_liked !== undefined) return route.is_liked;
        const likedBy = route.liked_by || [];
        return likedBy.includes(oderId);
      },

      getLikeCount: (routeId) => {
        const route = get().routes.find(r => r.id === routeId);
        if (!route) return 0;
        return route.liked_by?.length || route.like_count || 0;
      },
    }),
    {
      name: 'climbset-routes',
      partialize: (state) => ({
        routes: state.routes,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
