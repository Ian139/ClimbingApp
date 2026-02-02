'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { Wall } from '@/lib/types';

// Default wall
export const DEFAULT_WALL: Wall = {
  id: 'default-wall',
  user_id: 'local',
  name: 'Home Wall',
  image_url: '/walls/default-wall.jpg',
  image_width: 1920,
  image_height: 1080,
  is_public: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface WallsState {
  walls: Wall[];
  isLoading: boolean;

  // Actions
  addWall: (wall: Wall) => Promise<void>;
  updateWall: (id: string, updates: Partial<Wall>) => Promise<void>;
  deleteWall: (id: string) => Promise<void>;
  getWallById: (id: string) => Wall | undefined;

  // Sync actions
  fetchWalls: () => Promise<void>;
}

export const useWallsStore = create<WallsState>()(
  persist(
    (set, get) => ({
      walls: [DEFAULT_WALL],
      isLoading: false,

      // Fetch all public walls from Supabase
      fetchWalls: async () => {
        set({ isLoading: true });

        try {
          const supabase = createClient();

          const { data: remoteWalls, error } = await supabase
            .from('walls')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching walls:', error);
            set({ isLoading: false });
            return;
          }

          if (remoteWalls) {
            // Merge with local walls (keep default wall and local-only walls)
            const localWalls = get().walls.filter(w =>
              w.id === 'default-wall' || w.user_id === 'local-user'
            );

            const mergedWalls = [
              ...localWalls,
              ...remoteWalls.filter(rw => !localWalls.some(lw => lw.id === rw.id))
            ];

            set({ walls: mergedWalls, isLoading: false });
          }
        } catch (error) {
          console.error('Error fetching walls:', error);
          set({ isLoading: false });
        }
      },

      addWall: async (wall) => {
        // Add to local state immediately
        set((state) => ({
          walls: [...state.walls, { ...wall, is_public: true }],
        }));

        // Try to save to Supabase
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          const { error } = await supabase
            .from('walls')
            .insert({
              id: wall.id,
              user_id: user?.id || null,
              name: wall.name,
              description: wall.description,
              image_url: wall.image_url,
              image_width: wall.image_width,
              image_height: wall.image_height,
              is_public: true,
            });

          if (error) {
            console.error('Error saving wall to Supabase:', error);
          }
        } catch (error) {
          console.error('Error saving wall:', error);
        }
      },

      updateWall: async (id, updates) => {
        set((state) => ({
          walls: state.walls.map((w) =>
            w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w
          ),
        }));

        // Try to update in Supabase
        try {
          const wall = get().walls.find(w => w.id === id);
          if (wall && wall.user_id !== 'local-user' && wall.id !== 'default-wall') {
            const supabase = createClient();
            await supabase
              .from('walls')
              .update(updates)
              .eq('id', id);
          }
        } catch (error) {
          console.error('Error updating wall:', error);
        }
      },

      deleteWall: async (id) => {
        const wall = get().walls.find(w => w.id === id);

        set((state) => ({
          walls: state.walls.filter((w) => w.id !== id && w.id !== 'default-wall'),
        }));

        // Try to delete from Supabase
        try {
          if (wall && wall.user_id !== 'local-user' && wall.id !== 'default-wall') {
            const supabase = createClient();
            await supabase
              .from('walls')
              .delete()
              .eq('id', id);

            // Attempt to delete wall images from storage
            const { data, error } = await supabase.storage
              .from('walls')
              .list(id, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
            if (!error && data && data.length > 0) {
              const paths = data.map((item) => `${id}/${item.name}`);
              await supabase.storage.from('walls').remove(paths);
            }
          }
        } catch (error) {
          console.error('Error deleting wall:', error);
        }
      },

      getWallById: (id) => get().walls.find((w) => w.id === id),
    }),
    {
      name: 'climbset-walls',
      partialize: (state) => ({
        walls: state.walls,
      }),
    }
  )
);
