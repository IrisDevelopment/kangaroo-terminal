"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/* animation state types */
export type RooAnimation = 
  | 'idle-front'
  | 'idle-right'
  | 'idle-right-pointing'
  | 'walking-right'
  | 'walking-left'
  | 'walking-up'
  | 'walking-down'
  | 'sleeping'
  | 'thinking'
  | 'joyful-right'
  | 'joyful-left';

/* sprite folder map */
export const SPRITE_CONFIG: Record<RooAnimation, { folder: number; sprites: number[]; flip?: boolean }> = {
  'idle-front': { folder: 1, sprites: [1, 2, 3, 4, 5, 6] },
  'walking-right': { folder: 2, sprites: [7, 8, 9, 10, 11, 12] },
  'walking-left': { folder: 3, sprites: [13, 14, 15, 16, 17, 18] },
  'sleeping': { folder: 4, sprites: [19, 20, 21, 22, 23, 24] },
  'idle-right': { folder: 5, sprites: [25, 26, 27, 28, 29, 30] },
  'idle-right-pointing': { folder: 6, sprites: [31, 32, 33, 34, 35, 36] },
  'joyful-right': { folder: 7, sprites: [37, 38, 39, 40, 41, 42] },
  'joyful-left': { folder: 7, sprites: [37, 38, 39, 40, 41, 42], flip: true },
  'thinking': { folder: 8, sprites: [43, 44, 45, 46, 47, 48] },
  'walking-up': { folder: 9, sprites: [49, 50, 51, 52, 53, 54] },
  'walking-down': { folder: 10, sprites: [55, 56, 57, 58, 59, 60] },
};

/* ledge = surface roo can sit on */
export interface Ledge {
  id: string;
  element: HTMLElement;
  rect: DOMRect;
  priority: number; 
}

/* roo position */
export interface RooPosition {
  x: number;
  y: number;
}

/* tutorial messages per page */
export const PAGE_TUTORIALS: Record<string, string> = {
  '/': "welcome to kangaroo terminal! this is your command center for market analysis. feel free to ask me for help!",
  '/compare': "welcome to the arena! type two tickers above to start a comparison",
  '/portfolio': "this is your portfolio tracker. monitor your positions and see how your investments are performing in real-time!",
  '/hunter': "signal hunter scans the market for opportunities. let the algorithm find potential trades for you!",
  '/screener': "the screener helps you filter stocks by various criteria. set your parameters and find what you're looking for!",
  '/watchlist': "your watchlist keeps track of stocks you're interested in. add tickers to monitor them",
  '/cycles': "the cycle engine analyses market rotations, allowing for an understanding of where we are in the economic cycle",
  '/galaxy': "galaxy view shows the entire market universe! zoom in and out to explore sectors and relationships",
  '/rv': "relative value analysis compares assets against each other. find what's cheap and what's expensive here",
  '/briefing': "your morning briefing summarises overnight developments. start your day informed",
  '/simulation': "run backtests and simulations here and test your strategies before risking real capital",
  '/ai': "your ai analyst is ready to help. ask questions about markets, analyse charts, or get insights",
};

interface RooContextType {
  /* state */
  animation: RooAnimation;
  position: RooPosition;
  targetPosition: RooPosition | null;
  isDragging: boolean;
  isSpeaking: boolean;
  speechContent: string;
  isChatOpen: boolean;
  currentLedge: Ledge | null;
  isMoving: boolean;
  hasSeenTutorial: (page: string) => boolean;
  
  /* actions */
  setAnimation: (anim: RooAnimation) => void;
  setPosition: (pos: RooPosition) => void;
  setTargetPosition: (pos: RooPosition | null) => void;
  startDrag: () => void;
  endDrag: () => void;
  speak: (content: string) => void;
  stopSpeaking: () => void;
  openChat: () => void;
  closeChat: () => void;
  setCurrentLedge: (ledge: Ledge | null) => void;
  setIsMoving: (moving: boolean) => void;
  markTutorialSeen: (page: string) => void;
  triggerTutorial: () => void;
}

const RooContext = createContext<RooContextType | undefined>(undefined);

export function RooProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [animation, setAnimation] = useState<RooAnimation>('idle-front');
  const [position, setPosition] = useState<RooPosition>({ x: 100, y: 100 });
  const [targetPosition, setTargetPosition] = useState<RooPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechContent, setSpeechContent] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentLedge, setCurrentLedge] = useState<Ledge | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  // const [seenTutorials, setSeenTutorials] = useState<Set<string>>(new Set());
  
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* load tutorials from localStorage */
  /*
  useEffect(() => {
    const stored = localStorage.getItem('roo_seen_tutorials');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSeenTutorials(new Set(parsed));
      } catch {
        // ignore parse errors
      }
    }
  }, []);
  */

  const hasSeenTutorial = useCallback((page: string) => {
    // return seenTutorials.has(page);
    return false; 
  }, [/* seenTutorials */]);

  const markTutorialSeen = useCallback((page: string) => {
    /*
    setSeenTutorials(prev => {
      const next = new Set(prev);
      next.add(page);
      localStorage.setItem('roo_seen_tutorials', JSON.stringify([...next]));
      return next;
    });
    */
  }, []);

  const speak = useCallback((content: string) => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    setSpeechContent(content);
    setIsSpeaking(true);
    
    /* auto-hide speech after reading time */
    const words = content.split(' ').length;
    const duration = Math.max(8000, words * 300 + 5000);
    
    speechTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(false);
    }, duration);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    setIsSpeaking(false);
  }, []);

  const startDrag = useCallback(() => {
    setIsDragging(true);
    setTargetPosition(null);
    setIsMoving(false);
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  const openChat = useCallback(() => {
    setIsChatOpen(true);
    stopSpeaking();
  }, [stopSpeaking]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const triggerTutorial = useCallback(() => {
    const tutorial = PAGE_TUTORIALS[pathname] || PAGE_TUTORIALS['/'];
    if (tutorial) {
      speak(tutorial);
      markTutorialSeen(pathname);
    }
  }, [pathname, speak, markTutorialSeen]);

  /* trigger tutorial on page change if not seen */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSeenTutorial(pathname) && PAGE_TUTORIALS[pathname]) {
        triggerTutorial();
      }
    }, 1500); 

    return () => clearTimeout(timer);
  }, [pathname, hasSeenTutorial, triggerTutorial]);

  return (
    <RooContext.Provider
      value={{
        animation,
        position,
        targetPosition,
        isDragging,
        isSpeaking,
        speechContent,
        isChatOpen,
        currentLedge,
        isMoving,
        hasSeenTutorial,
        setAnimation,
        setPosition,
        setTargetPosition,
        startDrag,
        endDrag,
        speak,
        stopSpeaking,
        openChat,
        closeChat,
        setCurrentLedge,
        setIsMoving,
        markTutorialSeen,
        triggerTutorial,
      }}
    >
      {children}
    </RooContext.Provider>
  );
}

export function useRoo() {
  const context = useContext(RooContext);
  if (!context) {
    throw new Error('must be used within a RooProvider');
  }
  return context;
}
