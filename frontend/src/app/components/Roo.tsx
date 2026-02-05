"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useRoo, SPRITE_CONFIG, RooAnimation, Ledge, RooPosition } from '@/context/RooContext';
import { useSidebar } from '@/context/SidebarContext';
import RooSpeechBubble from './RooSpeechBubble';
import RooChat from './RooChat';

const ROO_WIDTH = 64;
const ROO_HEIGHT = 64;

const FRAME_DURATION = 120;


const MOVE_SPEED = 3; // 60fps target

const SLEEP_TIMEOUT = 10000; 
const THINK_TIMEOUT = 5000;

/* valid elements roo can sit on */
const LEDGE_SELECTORS = [
  '.luxury-card:not(.sidebar-card):not(.statusbar-card)',
  '.roo-ledge',
  '[data-roo-ledge="true"]',
];

/* elements roo shouldn't sit on */
const EXCLUDED_SELECTORS = [
  '.sidebar-nav',
  '.status-bar-inner',
  '[data-roo-exclude="true"]',
];

/* preload sprites to prevent flicker */
const preloadSprites = () => {
  Object.values(SPRITE_CONFIG).forEach(config => {
    config.sprites.forEach(spriteNum => {
      const img = new Image();
      img.src = `/assets/sprites/${config.folder}/${spriteNum}.png`;
    });
  });
};

/* run preload once module load */
if (typeof window !== 'undefined') {
  preloadSprites();
}

export default function Roo() {
  const {
    animation,
    position,
    targetPosition,
    isDragging,
    isSpeaking,
    speechContent,
    isChatOpen,
    isMoving,
    setAnimation,
    setPosition,
    setTargetPosition,
    startDrag,
    endDrag,
    openChat,
    closeChat,
    setCurrentLedge,
    setIsMoving,
  } = useRoo();

  const { isCollapsed: sidebarCollapsed } = useSidebar();
  const pathname = usePathname();

  const [currentFrame, setCurrentFrame] = useState(0);
  const [ledges, setLedges] = useState<Ledge[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  const rooRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleStartedRef = useRef(false);
  const lastPositionRef = useRef<RooPosition>(position);
  const isMovingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const animationRef = useRef<RooAnimation>(animation);
  const setAnimationRef = useRef(setAnimation);
  const isSpeakingRef = useRef(isSpeaking);
  const isSettledRef = useRef(false);

  const spriteConfig = SPRITE_CONFIG[animation];

  /* scan for valid ledges in dom */
  const scanLedges = useCallback(() => {
    const found: Ledge[] = [];
    const sidebarWidth = sidebarCollapsed ? 80 : 256;
    const statusBarHeight = 48;
    const headerHeight = 64;

    LEDGE_SELECTORS.forEach((selector, priority) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, idx) => {
          const htmlEl = el as HTMLElement;
          
          /* check element is visible */
          const style = window.getComputedStyle(htmlEl);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            htmlEl.offsetParent === null
          ) {
            return;
          }

          /* check excluded */
          const isExcluded = EXCLUDED_SELECTORS.some(exc => htmlEl.closest(exc));
          if (isExcluded) return;

          const rect = htmlEl.getBoundingClientRect();
          
          /* filter elements in sidebar or status bar areas */
          if (rect.left < sidebarWidth + 10) return;
          if (rect.top < headerHeight) return;
          if (rect.bottom > window.innerHeight - statusBarHeight) return;
          
          /* filter small elements */
          if (rect.width < ROO_WIDTH || rect.height < 20) return;

          found.push({
            id: `${selector}-${idx}`,
            element: htmlEl,
            rect,
            priority: priority + 1,
          });
        });
      } catch {
        /* ignore invalid */
      }
    });

    setLedges(prev => {
      // compare to prevent infinite loop
      if (prev.length === found.length) {
        const isSame = prev.every((p, i) => {
          const f = found[i];
          return p.id === f.id &&
                 Math.abs(p.rect.x - f.rect.x) < 1 && 
                 Math.abs(p.rect.y - f.rect.y) < 1 &&
                 Math.abs(p.rect.width - f.rect.width) < 1 && 
                 Math.abs(p.rect.height - f.rect.height) < 1;
        });
        if (isSame) return prev;
      }
      return found;
    });
    return found;
  }, [sidebarCollapsed]);

  /* find nearest ledge */
  const findNearestLedge = useCallback((fromPos: RooPosition): Ledge | null => {
    if (ledges.length === 0) return null;

    let nearest: Ledge | null = null;
    let minDistance = Infinity;

    ledges.forEach(ledge => {
      /* target top centre of ledge */
      const targetX = ledge.rect.left + ledge.rect.width / 2 - ROO_WIDTH / 2;
      const targetY = ledge.rect.top - ROO_HEIGHT;

      const dx = targetX - fromPos.x;
      const dy = targetY - fromPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const adjustedDistance = distance - ledge.priority * 50;

      if (adjustedDistance < minDistance) {
        minDistance = adjustedDistance;
        nearest = ledge;
      }
    });

    return nearest;
  }, [ledges]);

  /* get target pos for ledge */
  const getLedgeTargetPosition = useCallback((ledge: Ledge): RooPosition => {
    return {
      x: ledge.rect.left + ledge.rect.width / 2 - ROO_WIDTH / 2,
      y: ledge.rect.top - ROO_HEIGHT + 4, // slight overlap to look better
    };
  }, []);

  const getMovementAnimation = useCallback((from: RooPosition, to: RooPosition): RooAnimation => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const useJoyful = Math.random() < 0.25; // 25% chance of joyful walk animation

    /* determine direction */
    if (absDx > absDy) {
      if (dx > 0) {
        return useJoyful ? 'joyful-right' : 'walking-right';
      } else {
        return useJoyful ? 'joyful-left' : 'walking-left';
      }
    } else {
      return dy > 0 ? 'walking-down' : 'walking-up';
    }
  }, []);

  /* stay within viewport */
  const clampPosition = useCallback((pos: RooPosition): RooPosition => {
    const sidebarWidth = sidebarCollapsed ? 80 : 256;
    const statusBarHeight = 48;
    const headerHeight = 64;

    return {
      x: Math.max(sidebarWidth + 10, Math.min(window.innerWidth - ROO_WIDTH - 10, pos.x)),
      y: Math.max(headerHeight + 10, Math.min(window.innerHeight - ROO_HEIGHT - statusBarHeight - 10, pos.y)),
    };
  }, [sidebarCollapsed]);

  const stopIdleInterval = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (thinkTimerRef.current) {
      clearTimeout(thinkTimerRef.current);
      thinkTimerRef.current = null;
    }
    if (idleIntervalRef.current) {
      clearInterval(idleIntervalRef.current);
      idleIntervalRef.current = null;
    }
  };

  /* clear timer and reset guarad so new idle start */
  const resetIdleState = () => {
    stopIdleInterval();
    idleStartedRef.current = false;
  };

  const startIdleStateMachine = () => {
    if (idleStartedRef.current) return; // only start once 
    idleStartedRef.current = true;
    
    const currentAnim = animationRef.current;
    const isAlreadyIdle = currentAnim === 'idle-front' || currentAnim === 'idle-right' ||  // only pick random idle if we're not alr doing something
                          currentAnim === 'thinking' || currentAnim === 'sleeping';
    
    let randomIdle: RooAnimation;
    if (isAlreadyIdle) { // keep current anim
      randomIdle = currentAnim;
    } else {
      const idleOptions: RooAnimation[] = ['idle-front', 'idle-right', 'idle-right']; // pick random idle
      randomIdle = idleOptions[Math.floor(Math.random() * idleOptions.length)];
    }
    setAnimationRef.current(randomIdle);
    animationRef.current = randomIdle;
    
    let elapsedSeconds = 0;
    
    idleIntervalRef.current = setInterval(() => {
      if (isDraggingRef.current || isMovingRef.current || isSpeakingRef.current) {
        stopIdleInterval();
        return;
      }
      
      elapsedSeconds += 1;
      
      /* thinking at 5s */
      if (elapsedSeconds === 5 && animationRef.current !== 'thinking' && animationRef.current !== 'sleeping') {
        setAnimationRef.current('thinking');
        animationRef.current = 'thinking';
      }
      
      /* sleeping at 10s */
      if (elapsedSeconds === 10 && animationRef.current !== 'sleeping') {
        setAnimationRef.current('sleeping');
        animationRef.current = 'sleeping';
        if (idleIntervalRef.current) {
          clearInterval(idleIntervalRef.current);
          idleIntervalRef.current = null;
        }
      }
    }, 1000);
  };

  useEffect(() => {
    animationRef.current = animation;
  }, [animation]);

  useEffect(() => {
    setAnimationRef.current = setAnimation;
  }, [setAnimation]);

  useEffect(() => {
    return () => {
      resetIdleState();
    };
  }, []);

  /* sprite frame anim */
  useEffect(() => {
    const duration = animation === 'sleeping' ? FRAME_DURATION * 2 : FRAME_DURATION;
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % spriteConfig.sprites.length);
    }, duration);

    return () => clearInterval(interval);
  }, [spriteConfig.sprites.length, animation]);

  useEffect(() => {
    isMovingRef.current = isMoving;
  }, [isMoving]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isSettledRef.current = isSettled;
  }, [isSettled]);

  /* movement anim loop */
  useEffect(() => {
    if (!targetPosition || isDragging || isSettledRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    /* reset settled state when starting new movement */
    isSettledRef.current = false;
    setIsMoving(true);
    setIsSettled(false);
    
    const initialAnim = getMovementAnimation(lastPositionRef.current, targetPosition);
    setAnimation(initialAnim);
    let currentAnim = initialAnim;

    const animate = () => {
      const current = lastPositionRef.current;
      const dx = targetPosition.x - current.x;
      const dy = targetPosition.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MOVE_SPEED) {
        /* arrived at targ */
        isMovingRef.current = false;
        isSettledRef.current = true;
        
        setPosition(targetPosition);
        lastPositionRef.current = targetPosition;
        setTargetPosition(null);
        setIsMoving(false);
        setIsSettled(true);
        
        startIdleStateMachine();
        return;
      }

      /* move towards targ */
      const ratio = MOVE_SPEED / distance;
      const newPos = {
        x: current.x + dx * ratio,
        y: current.y + dy * ratio,
      };

      setPosition(newPos);
      lastPositionRef.current = newPos;

      /* don't change anim mid-walk */
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetPosition, isDragging, setPosition, setTargetPosition, setIsMoving, setAnimation, getMovementAnimation]);

  /* scan ledges on mount, scroll & resize */
  useEffect(() => {
    const handleUpdate = () => {
      const found = scanLedges();
      
      /* ojnly find new ledge if not alr on one */
      if (!isMovingRef.current && !isDraggingRef.current && !isSettledRef.current && found.length > 0) {
        const currentPos = lastPositionRef.current;
        const nearest = findNearestLedge(currentPos);
        
        if (nearest) {
          const target = getLedgeTargetPosition(nearest);
          const dx = Math.abs(target.x - currentPos.x);
          const dy = Math.abs(target.y - currentPos.y);
          
          if (dx > 10 || dy > 10) {
            setTargetPosition(target);
            setCurrentLedge(nearest);
          } else {
            setIsSettled(true);
            isSettledRef.current = true; 
            startIdleStateMachine();
          }
        }
      }
    };

    
    let scrollTimeout: NodeJS.Timeout; 
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleUpdate, 150);
    };

    const initTimeout = setTimeout(() => {
      handleUpdate();
      setIsInitialized(true);
    }, 500);

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      clearTimeout(initTimeout);
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [scanLedges, findNearestLedge, getLedgeTargetPosition, setTargetPosition, setCurrentLedge]);

  useEffect(() => {
    if (!isInitialized) return;

    /* trigger new ledge search upon page change */
    resetIdleState();
    isSettledRef.current = false;
    setIsSettled(false);

    const tryFindLedge = () => {
      const found = scanLedges();
      if (found.length > 0 && !isDraggingRef.current && !isSettledRef.current) {
        const currentPos = lastPositionRef.current;
        const nearest = findNearestLedge(currentPos);
        
        if (nearest) {
          const target = getLedgeTargetPosition(nearest);
          
          /* check if we need to move (jitter issue) */
          const dx = Math.abs(target.x - currentPos.x);
          const dy = Math.abs(target.y - currentPos.y);
          
          if (dx > 10 || dy > 10) {
            setTargetPosition(target);
            setCurrentLedge(nearest);
            return true; 
          } else {
             setIsSettled(true);
             isSettledRef.current = true;
             startIdleStateMachine();
             return true; 
          }
        }
      }
      return false; 
    };

    /* self-note: could probably remove this later [!] */
    const t1 = setTimeout(tryFindLedge, 300);
    const t2 = setTimeout(tryFindLedge, 800);
    const t3 = setTimeout(tryFindLedge, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, isInitialized, scanLedges, findNearestLedge, getLedgeTargetPosition, setTargetPosition, setCurrentLedge]);

  /* drag */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    
    resetIdleState();
    isSettledRef.current = false;
    
    startDrag();
    setAnimation('idle-front');

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;

      const newPos = clampPosition({
        x: moveEvent.clientX - ROO_WIDTH / 2,
        y: moveEvent.clientY - ROO_HEIGHT / 2,
      });

      setPosition(newPos);
      lastPositionRef.current = newPos;
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (!dragStartRef.current) return;

      const dx = Math.abs(upEvent.clientX - dragStartRef.current.x);
      const dy = Math.abs(upEvent.clientY - dragStartRef.current.y);
      const timeDiff = Date.now() - dragStartRef.current.time;

      /* if no movement then click */
      if (dx < 5 && dy < 5 && timeDiff < 200) {
        openChat();
      } else {
        setIsSettled(false);
        const currentPos = lastPositionRef.current;
        const nearest = findNearestLedge(currentPos);
        
        if (nearest) {
          setTargetPosition(getLedgeTargetPosition(nearest));
          setCurrentLedge(nearest);
        }
      }

      endDrag();
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [startDrag, endDrag, setAnimation, setPosition, clampPosition, openChat, findNearestLedge, getLedgeTargetPosition, setTargetPosition, setCurrentLedge]);

  /* touch */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    
    resetIdleState();
    isSettledRef.current = false;
    
    startDrag();
    setAnimation('idle-front');

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragStartRef.current) return;
      const touch = moveEvent.touches[0];

      const newPos = clampPosition({
        x: touch.clientX - ROO_WIDTH / 2,
        y: touch.clientY - ROO_HEIGHT / 2,
      });

      setPosition(newPos);
      lastPositionRef.current = newPos;
    };

    const handleTouchEnd = (endEvent: TouchEvent) => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);

      if (!dragStartRef.current) return;

      const touch = endEvent.changedTouches[0];
      const dx = Math.abs(touch.clientX - dragStartRef.current.x);
      const dy = Math.abs(touch.clientY - dragStartRef.current.y);
      const timeDiff = Date.now() - dragStartRef.current.time;

      if (dx < 5 && dy < 5 && timeDiff < 200) {
        openChat();
      } else {
        setIsSettled(false);
        const currentPos = lastPositionRef.current;
        const nearest = findNearestLedge(currentPos);
        
        if (nearest) {
          setTargetPosition(getLedgeTargetPosition(nearest));
          setCurrentLedge(nearest);
        }
      }

      endDrag();
      dragStartRef.current = null;
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [startDrag, endDrag, setAnimation, setPosition, clampPosition, openChat, findNearestLedge, getLedgeTargetPosition, setTargetPosition, setCurrentLedge]);

  const currentSpriteIndex = spriteConfig.sprites[currentFrame];
  const spritePath = useMemo(() => 
    `/assets/sprites/${spriteConfig.folder}/${currentSpriteIndex}.png`,
    [spriteConfig.folder, currentSpriteIndex]
  );

  if (!isInitialized) return null;

  return (
    <>
      {/* roo character */}
      <motion.div
        ref={rooRef}
        className="roo-container"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: ROO_WIDTH,
          height: ROO_HEIGHT,
          zIndex: 45,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
        animate={{
          scale: isDragging ? 1.1 : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <img
          src={spritePath}
          alt="Roo the Kangaroo"
          className="roo-sprite"
          style={{
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated',
            transform: spriteConfig.flip ? 'scaleX(-1)' : 'none',
            pointerEvents: 'none',
            transition: 'opacity 0.05s ease-out',
          }}
          draggable={false}
        />
      </motion.div>

      {/* speech bubble */}
      <AnimatePresence>
        {isSpeaking && !isChatOpen && (
          <RooSpeechBubble
            content={speechContent}
            position={position}
            rooWidth={ROO_WIDTH}
            rooHeight={ROO_HEIGHT}
          />
        )}
      </AnimatePresence>

      {/* chat interface */}
      <AnimatePresence>
        {isChatOpen && (
          <RooChat
            position={position}
            rooWidth={ROO_WIDTH}
            rooHeight={ROO_HEIGHT}
            onClose={closeChat}
          />
        )}
      </AnimatePresence>
    </>
  );
}
