import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import type { Route, Ascent } from '@climbset/shared';

interface RoutesState {
  routes: Route[];
  isLoading: boolean;
  lastFetched: string | null;
  isOfflineMode: boolean;

  fetchRoutes: () => Promise<void>;
  addRoute: (route: Route) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  toggleLike: (routeId: string) => Promise<void>;
  addAscent: (routeId: string, ascent: Ascent) => Promise<void>;
}

export const useRoutesStore = create<RoutesState>()(
  persist(
    (set, get) => ({
      routes: [],
      isLoading: false,
      lastFetched: null,
      isOfflineMode: false,

      fetchRoutes: async () => {
        set({ isLoading: true });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          const currentUserId = user?.id || 'local-user';

          // Fetch routes with ascents
          let result = await supabase
            .from('routes')
            .select(`
              *,
              ascents (*),
              comments (*)
            `)
            .eq('is_public', true)
            .order('created_at', { ascending: false });

          if (result.error) {
            // Fallback without comments
            result = await supabase
              .from('routes')
              .select(`
                *,
                ascents (*)
              `)
              .eq('is_public', true)
              .order('created_at', { ascending: false });
          }

          if (result.error) {
            set({ isLoading: false, isOfflineMode: true });
            return;
          }

          // Fetch likes
          const { data: allLikes, error: likesError } = await supabase
            .from('route_likes')
            .select('route_id, user_id');

          const likesByRoute: Record<string, string[]> = {};
          if (!likesError && allLikes) {
            (allLikes as Array<{ route_id: string; user_id: string }>).forEach((like) => {
              if (!likesByRoute[like.route_id]) likesByRoute[like.route_id] = [];
              likesByRoute[like.route_id].push(like.user_id);
            });
          }

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
            const localRoutes = get().routes.filter(r => r.user_id === 'local-user');
            const mergedRoutes = [
              ...remoteRoutes,
              ...localRoutes.filter(lr => !remoteRoutes.some(rr => rr.id === lr.id)),
            ];

            set({
              routes: mergedRoutes,
              lastFetched: new Date().toISOString(),
              isLoading: false,
              isOfflineMode: false,
            });
          } else {
            set({ isLoading: false, isOfflineMode: false });
          }
        } catch {
          set({ isLoading: false, isOfflineMode: true });
        }
      },

      addRoute: async (route) => {
        set((state) => ({
          routes: [{ ...route, is_public: true }, ...state.routes],
        }));

        try {
          const { data: { user } } = await supabase.auth.getUser();
          const routeData = { ...route };
          delete (routeData as any).ascents;
          delete (routeData as any).wall;
          delete (routeData as any).user;
          delete (routeData as any).is_liked;
          delete (routeData as any).like_count;
          delete (routeData as any).liked_by;
          delete (routeData as any).comments;

          await supabase.from('routes').insert({
            ...routeData,
            user_id: user?.id || null,
            is_public: true,
          });
        } catch {
          // Offline — local state already updated
        }
      },

      deleteRoute: async (id) => {
        const route = get().routes.find(r => r.id === id);
        set((state) => ({
          routes: state.routes.filter(r => r.id !== id),
        }));

        try {
          if (route && route.user_id !== 'local-user') {
            await supabase.from('routes').delete().eq('id', id);
          }
        } catch {
          // Offline
        }
      },

      toggleLike: async (routeId) => {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'local-user';
        const route = get().routes.find(r => r.id === routeId);
        if (!route) return;

        const currentLikes = route.liked_by || [];
        const isCurrentlyLiked = currentLikes.includes(userId);
        const newLikes = isCurrentlyLiked
          ? currentLikes.filter(id => id !== userId)
          : [...currentLikes, userId];

        set((state) => ({
          routes: state.routes.map(r =>
            r.id === routeId
              ? { ...r, liked_by: newLikes, like_count: newLikes.length, is_liked: !isCurrentlyLiked }
              : r
          ),
        }));

        if (user) {
          try {
            if (isCurrentlyLiked) {
              await supabase.from('route_likes').delete().eq('route_id', routeId).eq('user_id', user.id);
            } else {
              await supabase.from('route_likes').insert({ route_id: routeId, user_id: user.id });
            }
          } catch {
            // Revert
            set((state) => ({
              routes: state.routes.map(r =>
                r.id === routeId
                  ? { ...r, liked_by: currentLikes, like_count: currentLikes.length, is_liked: isCurrentlyLiked }
                  : r
              ),
            }));
          }
        }
      },

      addAscent: async (routeId, ascent) => {
        set((state) => ({
          routes: state.routes.map(r =>
            r.id === routeId
              ? { ...r, ascents: [...(r.ascents || []), ascent], updated_at: new Date().toISOString() }
              : r
          ),
        }));

        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('ascents').insert({
            id: ascent.id,
            route_id: routeId,
            user_id: user?.id || null,
            user_name: ascent.user_name,
            grade_v: ascent.grade_v,
            rating: ascent.rating,
          });
        } catch {
          // Offline
        }
      },
    }),
    {
      name: 'climbset-routes',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        routes: state.routes,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
