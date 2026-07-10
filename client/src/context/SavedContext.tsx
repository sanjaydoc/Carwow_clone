import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
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

  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    api
      .getSavedIds()
      .then(({ ids }) => setSavedIds(new Set(ids)))
      .catch(() => setSavedIds(new Set()));
  }, [user]);

  const isSaved = (id: number) => savedIds.has(id);

  const toggle = async (id: number) => {
    if (!user) throw new Error('not-authenticated');
    const currentlySaved = savedIds.has(id);
    // optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (currentlySaved) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (currentlySaved) await api.unsaveCar(id);
      else await api.saveCar(id);
    } catch (e) {
      // revert on failure
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.add(id);
        else next.delete(id);
        return next;
      });
      throw e;
    }
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
