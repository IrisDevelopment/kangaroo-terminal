"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL, apiFetch } from '@/lib/api';

/* settings interface */
export interface AppSettings {
  /* roo */
  rooEnabled: boolean;
  speechBubblesEnabled: boolean;
  /* interface  */
  theme: 'dark' | 'light';
  animationsEnabled: boolean;
  
  /* data */
  scraperRefreshRate: number; 
  chartEventsEnabled: boolean; 
}

/* defaults */
const DEFAULT_SETTINGS: AppSettings = {
  rooEnabled: true,
  speechBubblesEnabled: true,
  theme: 'dark',
  animationsEnabled: true,
  scraperRefreshRate: 5000,
  chartEventsEnabled: false,
};

const STORAGE_KEY = 'k-terminal-settings';

interface SettingsContextType {
  settings: AppSettings;
  isDisplayMode: boolean;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetTutorials: () => void;
  clearCache: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDisplayMode, setIsDisplayMode] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/display-mode`)
      .then(r => r.json())
      .then(data => setIsDisplayMode(data.enabled))
      .catch(() => {});
  }, []);

  /* load settings from localStorage on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      /* ignore */
    }
    setIsLoaded(true);
  }, []);

  /* persist to localStorage */
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        /* ignore  */
      }
    }
  }, [settings, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      const html = document.documentElement;
      if (settings.theme === 'light') {
        html.classList.add('theme-light');
      } else {
        html.classList.remove('theme-light');
      }
    }
  }, [settings.theme, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      const html = document.documentElement;
      if (!settings.animationsEnabled) {
        html.classList.add('reduce-motion');
      } else {
        html.classList.remove('reduce-motion');
      }
    }
  }, [settings.animationsEnabled, isLoaded]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetTutorials = useCallback(() => {
    try {
      localStorage.removeItem('roo_seen_tutorials');
    } catch {
      /* ignore */
    }
  }, []);

  const clearCache = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('k-terminal-') && key !== STORAGE_KEY) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isDisplayMode, updateSetting, resetTutorials, clearCache }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
