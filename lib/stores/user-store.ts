'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Moderator emails - these users can delete any route/wall
const MODERATOR_EMAILS = ['ian139@example.com', 'ian139'];

interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isModerator: boolean;
}

interface UserState {
  // Current user state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isModerator: boolean;

  // For backwards compatibility
  userId: string;
  displayName: string;

  // Actions
  signup: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setDisplayName: (name: string) => void;
  initializeAuth: () => Promise<void>;
}

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  const email = supabaseUser.email || '';
  const displayName = supabaseUser.user_metadata?.display_name || email.split('@')[0] || 'User';

  // Check if user is a moderator
  const isModerator = MODERATOR_EMAILS.some(
    modEmail => email.toLowerCase() === modEmail.toLowerCase() ||
                displayName.toLowerCase() === modEmail.toLowerCase()
  );

  return {
    id: supabaseUser.id,
    email,
    displayName,
    createdAt: supabaseUser.created_at,
    isModerator,
  };
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isModerator: false,
      userId: '',
      displayName: 'Guest',

      initializeAuth: async () => {
        const supabase = createClient();

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const user = mapSupabaseUser(session.user);
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              isModerator: user.isModerator,
              userId: user.id,
              displayName: user.displayName,
            });
          } else {
            set({ isLoading: false });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
              const user = mapSupabaseUser(session.user);
              set({
                user,
                isAuthenticated: true,
                isModerator: user.isModerator,
                userId: user.id,
                displayName: user.displayName,
              });
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isModerator: false,
                userId: '',
                displayName: 'Guest',
              });
            }
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false });
        }
      },

      signup: async (email: string, password: string, displayName?: string) => {
        const supabase = createClient();

        // Validate email format
        if (!email.includes('@') || !email.includes('.')) {
          return { success: false, error: 'Invalid email format' };
        }

        // Validate password length
        if (password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters' };
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName || email.split('@')[0],
              },
            },
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (data.user) {
            const user = mapSupabaseUser(data.user);
            set({
              user,
              isAuthenticated: true,
              isModerator: user.isModerator,
              userId: user.id,
              displayName: user.displayName,
            });
            return { success: true };
          }

          return { success: false, error: 'Signup failed' };
        } catch {
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      login: async (email: string, password: string) => {
        const supabase = createClient();

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (data.user) {
            const user = mapSupabaseUser(data.user);
            set({
              user,
              isAuthenticated: true,
              isModerator: user.isModerator,
              userId: user.id,
              displayName: user.displayName,
            });
            return { success: true };
          }

          return { success: false, error: 'Login failed' };
        } catch {
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      logout: async () => {
        const supabase = createClient();

        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        }

        set({
          user: null,
          isAuthenticated: false,
          isModerator: false,
          userId: '',
          displayName: 'Guest',
        });
      },

      setDisplayName: async (name: string) => {
        const supabase = createClient();
        const state = get();

        if (state.user) {
          try {
            await supabase.auth.updateUser({
              data: { display_name: name },
            });
          } catch (error) {
            console.error('Failed to update display name:', error);
          }

          set({
            displayName: name,
            user: { ...state.user, displayName: name },
          });
        } else {
          set({ displayName: name });
        }
      },
    }),
    {
      name: 'climbset-user',
      partialize: (state) => ({
        displayName: state.displayName,
      }),
    }
  )
);
