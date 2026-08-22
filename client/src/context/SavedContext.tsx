import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SavedContextValue {
  savedIds: Set<number>;
  isSaved: (id: number) => boolean;
  toggle: (id: number) => Promise<void>;
  count: number;
}

const SavedContext = createContext<SavedContextValue | undefined>(undefined);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const key = user ? `saved:${user.id}` : null;

  useEffect(() => {
    if (!key) {
      setSavedIds(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      setSavedIds(new Set(raw ? (JSON.parse(raw) as number[]) : []));
    } catch {
      setSavedIds(new Set());
    }
  }, [key]);

  const persist = (ids: Set<number>) => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify([...ids]));
    } catch {
      /* ignore */
    }
  };

  const isSaved = (id: number) => savedIds.has(id);

  const toggle = async (id: number) => {
    if (!user) throw new Error('not-authenticated');
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  };

  return (
    <SavedContext.Provider value={{ savedIds, isSaved, toggle, count: savedIds.size }}>
      {children}
    </SavedContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within SavedProvider');
  return ctx;
}
