"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RooPosition } from '@/context/RooContext';

interface RooSpeechBubbleProps {
  content: string;
  position: RooPosition;
  rooWidth: number;
  rooHeight: number;
}

export default function RooSpeechBubble({ content, position, rooWidth, rooHeight }: RooSpeechBubbleProps) {
  const [isLight, setIsLight] = useState(false); // check fi light theme is active
  
  useEffect(() => {
    const checkTheme = () => {
      setIsLight(document.documentElement.classList.contains('theme-light'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  /* calculate bubble position */
  const bubbleWidth = 240;
  const bubbleMinHeight = 60;
  const padding = 8;
  const tailHeight = 12;
  const horizontalOffset = 10;

  const spaceAbove = position.y;
  const spaceRight = window.innerWidth - (position.x + rooWidth);
  const showBelow = spaceAbove < 150;

  let bubbleX = position.x + rooWidth + horizontalOffset;
  
  if (spaceRight < bubbleWidth + 20) {
    bubbleX = position.x - bubbleWidth - horizontalOffset;
  }
  
  bubbleX = Math.max(10, Math.min(window.innerWidth - bubbleWidth - 10, bubbleX)); // keep within viewport

  const verticalStyle: React.CSSProperties = showBelow 
    ? { top: position.y + rooHeight - 5 } 
    : { bottom: window.innerHeight - position.y - 5 };

  const isOnRight = position.x < bubbleX;
  
  /* theme-aware colors */
  const borderColor = isLight ? "rgba(139, 90, 43, 0.5)" : "rgba(198, 142, 86, 0.6)";
  const fillColor = isLight ? "#F5F0EB" : "#1e1612"; 

  return (
    <motion.div
      className="roo-speech-bubble"
      style={{
        position: 'fixed',
        left: bubbleX,
        width: bubbleWidth,
        zIndex: 46,
        ...verticalStyle
      }}
      initial={{ opacity: 0, scale: 0.9, y: showBelow ? -5 : 5, x: isOnRight ? -5 : 5 }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: showBelow ? -5 : 5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="relative">
        {/* bubble content */}
        <div className="roo-bubble-content relative z-10">
          <p className="roo-bubble-text">{content}</p>
        </div>

        {/* svg tail, absolute */}
        <svg
          className="absolute z-20"
          style={{
            width: '12px',
            height: '12px',
            [showBelow ? 'top' : 'bottom']: '-10px', 
            [isOnRight ? 'left' : 'right']: '12px',
            transform: `scaleY(${showBelow ? -1 : 1}) scaleX(${isOnRight ? 1 : -1})`,
          }}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* right angle triangle pointing to bottom left */}
          <path 
            d="M12 0 L0 12 L12 8 Z" 
            fill={fillColor} 
            stroke={borderColor} 
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* cover border seam */}
          <path 
            d="M11 0 L11 9" 
            stroke={fillColor} 
            strokeWidth="3" 
          />
        </svg>
      </div>
    </motion.div>
  );
}
