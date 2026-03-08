import { create } from 'zustand';
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
  (set, get) => ({
    walls: [],
    selectedWall: null,
    isLoading: false,

    setSelectedWall: (wall) => set({ selectedWall: wall }),

    fetchWalls: async () => {
      set({ isLoading: true });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        let query = supabase
          .from('walls')
          .select('*')
          .order('created_at', { ascending: false });

        if (userId) {
          query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
        } else {
          query = query.eq('is_public', true);
        }

        const { data, error } = await query;

        if (error) {
          set({ isLoading: false });
          return;
        }

        const currentSelected = get().selectedWall;
        const nextSelected = currentSelected
          ? data?.find((w) => w.id === currentSelected.id) || data?.[0] || null
          : data?.[0] || null;

        set({
          walls: data || [],
          selectedWall: nextSelected,
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    },

    addWall: async (wall) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('walls').insert({
          id: wall.id,
          user_id: user?.id || null,
          name: wall.name,
          description: wall.description,
          image_url: wall.image_url,
          image_width: wall.image_width,
          image_height: wall.image_height,
          is_public: true,
        });
        if (error) throw error;
        await get().fetchWalls();
      } catch {
        // offline
      }
    },

    updateWall: async (id, updates) => {
      try {
        const { error } = await supabase.from('walls').update({
          ...updates,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        await get().fetchWalls();
      } catch {
        // offline
      }
    },

    deleteWall: async (id) => {
      try {
        const { error } = await supabase.from('walls').delete().eq('id', id);
        if (error) throw error;
        const { data } = await supabase.storage
          .from('walls')
          .list(id, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
        if (data && data.length > 0) {
          const paths = data.map((item) => `${id}/${item.name}`);
          await supabase.storage.from('walls').remove(paths);
        }
        await get().fetchWalls();
      } catch {
        // offline
      }
    },

    getWallById: (id) => get().walls.find((w) => w.id === id),
  })
);
