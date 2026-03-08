import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColors = {
  background: string;
  card: string;
  text: string;
  muted: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  destructive: string;
};

const lightColors: ThemeColors = {
  background: '#f8f5ee',
  card: '#fdfcf8',
  text: '#2d1e14',
  muted: '#635146',
  primary: '#8e5224',
  secondary: '#258651',
  accent: '#319751',
  border: '#e4ddcf',
  destructive: '#cc272e',
};

const darkColors: ThemeColors = {
  background: '#0b0905',
  card: '#14110d',
  text: '#f5f1ea',
  muted: '#a49e91',
  primary: '#6faa62',
  secondary: '#a87346',
  accent: '#848d42',
  border: '#2b2823',
  destructive: '#db4241',
};

export const colors: ThemeColors = { ...lightColors };

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: Exclude<ThemeMode, 'system'>;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'climbset-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!isMounted) return;
        if (value === 'light' || value === 'dark' || value === 'system') {
          setModeState(value);
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  const resolvedMode: 'light' | 'dark' = mode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : mode;

  useEffect(() => {
    const next = resolvedMode === 'dark' ? darkColors : lightColors;
    Object.assign(colors, next);
  }, [resolvedMode]);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => undefined);
  };

  const value = useMemo(() => ({ mode, resolvedMode, setMode, colors }), [mode, resolvedMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { mode: 'system' as ThemeMode, resolvedMode: 'light' as const, setMode: () => {}, colors };
  }
  return context;
}
