'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Wall } from '@/lib/types';
import { DEFAULT_WALL } from './walls-store';

interface WallState {
  selectedWall: Wall | null;
  setSelectedWall: (wall: Wall | null) => void;
}

export const useWallStore = create<WallState>()(
  persist(
    (set) => ({
      selectedWall: DEFAULT_WALL,
      setSelectedWall: (wall) => set({ selectedWall: wall }),
    }),
    {
      name: 'climbset-wall',
    }
  )
);
