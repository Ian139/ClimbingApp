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

          // Fetch all public routes with their ascents and comments
          const { data: remoteRoutes, error } = await supabase
            .from('routes')
            .select(`
              *,
              ascents (*),
              comments (*)
            `)
            .eq('is_public', true)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching routes:', error);
            return;
          }

          if (remoteRoutes) {
            // Merge with local routes (keep local-only routes)
            const localRoutes = get().routes.filter(r => r.user_id === 'local-user');
            const mergedRoutes = [
              ...remoteRoutes.map(r => ({
                ...r,
                holds: r.holds || [],
                ascents: r.ascents || [],
                comments: r.comments || [],
              })),
              ...localRoutes.filter(lr => !remoteRoutes.some(rr => rr.id === lr.id))
            ];

            set({
              routes: mergedRoutes,
              lastFetched: new Date().toISOString(),
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Error fetching routes:', error);
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
          const { ascents, wall, user: routeUser, is_liked, like_count, ...routeData } = route;

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

          const { ascents, wall, user: routeUser, is_liked, like_count, ...routeData } = route;

          const { error } = await supabase
            .from('routes')
            .insert({
              ...routeData,
              user_id: user?.id || null, // null for anonymous users
              is_public: true,
            });

          if (error) {
            console.error('Error saving route to Supabase:', error);
          }
        } catch (error) {
          console.error('Error saving route:', error);
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
            const { ascents, wall, user, is_liked, like_count, ...safeUpdates } = updates as any;

            await supabase
              .from('routes')
              .update(safeUpdates)
              .eq('id', id);
          }
        } catch (error) {
          console.error('Error updating route:', error);
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
          console.error('Error deleting route:', error);
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

          if (error) {
            console.error('Error saving ascent:', error);
          }
        } catch (error) {
          console.error('Error saving ascent:', error);
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
          console.error('Error deleting ascent:', error);
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

          if (error) {
            console.error('Error saving comment:', error);
          }
        } catch (error) {
          console.error('Error saving comment:', error);
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
          console.error('Error deleting comment:', error);
        }
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
