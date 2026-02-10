import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import type { Wall } from '@climbset/shared';

export const DEFAULT_WALL: Wall = {
  id: 'default-wall',
  user_id: 'local-user',
  name: 'Home Wall',
  image_url: '',
  image_width: 1920,
  image_height: 1080,
  is_public: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface WallsState {
  walls: Wall[];
  selectedWall: Wall | null;
  isLoading: boolean;

  setSelectedWall: (wall: Wall | null) => void;
  fetchWalls: () => Promise<void>;
  addWall: (wall: Wall) => Promise<void>;
  updateWall: (id: string, updates: Partial<Wall>) => Promise<void>;
  deleteWall: (id: string) => Promise<void>;
  getWallById: (id: string) => Wall | undefined;
}

export const useWallsStore = create<WallsState>()(
  persist(
    (set, get) => ({
      walls: [DEFAULT_WALL],
      selectedWall: DEFAULT_WALL,
      isLoading: false,

      setSelectedWall: (wall) => set({ selectedWall: wall }),

      fetchWalls: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('walls')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

          if (error) {
            set({ isLoading: false });
            return;
          }

          const localWalls = get().walls.filter(
            (w) => w.id === 'default-wall' || w.user_id === 'local-user'
          );

          const mergedWalls = [
            ...localWalls,
            ...(data || []).filter((rw) => !localWalls.some((lw) => lw.id === rw.id)),
          ];
          const currentSelected = get().selectedWall;
          const firstRemote = (data || [])[0];
          set({
            walls: mergedWalls,
            selectedWall:
              currentSelected?.id === 'default-wall' && firstRemote
                ? firstRemote
                : currentSelected,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      addWall: async (wall) => {
        set((state) => ({ walls: [...state.walls, { ...wall, is_public: true }] }));

        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('walls').insert({
            id: wall.id,
            user_id: user?.id || null,
            name: wall.name,
            description: wall.description,
            image_url: wall.image_url,
            image_width: wall.image_width,
            image_height: wall.image_height,
            is_public: true,
          });
        } catch {
          // offline
        }
      },

      updateWall: async (id, updates) => {
        set((state) => ({
          walls: state.walls.map((w) =>
            w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w
          ),
        }));

        try {
          const wall = get().walls.find((w) => w.id === id);
          if (wall && wall.user_id !== 'local-user' && wall.id !== 'default-wall') {
            await supabase.from('walls').update(updates).eq('id', id);
          }
        } catch {
          // offline
        }
      },

      deleteWall: async (id) => {
        const wall = get().walls.find((w) => w.id === id);
        set((state) => ({
          walls: state.walls.filter((w) => w.id !== id && w.id !== 'default-wall'),
        }));

        try {
          if (wall && wall.user_id !== 'local-user' && wall.id !== 'default-wall') {
            await supabase.from('walls').delete().eq('id', id);
            const { data } = await supabase.storage
              .from('walls')
              .list(id, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
            if (data && data.length > 0) {
              const paths = data.map((item) => `${id}/${item.name}`);
              await supabase.storage.from('walls').remove(paths);
            }
          }
        } catch {
          // offline
        }
      },

      getWallById: (id) => get().walls.find((w) => w.id === id),
    }),
    {
      name: 'climbset-walls',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        walls: state.walls,
        selectedWall: state.selectedWall,
      }),
    }
  )
);
