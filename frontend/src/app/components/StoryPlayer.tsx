"use client";

import { useEffect, useState, useRef } from "react";
import { 
  X, ExternalLink, Rocket, TrendingUp, TrendingDown, AlertTriangle, Zap, Activity, Info, Flame, Droplets, Anchor, Mountain, Skull, Trophy, Star,
  DollarSign, BarChart, BarChart2, BarChart3, LineChart, PieChart, CircleDollarSign, Coins, Wallet, CreditCard,
  Building, Building2, Store, Globe, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight, Briefcase, Target,
  Clock, CheckCircle, XCircle, Sparkles, Crown, Eye, Lock, Unlock, ShieldCheck, ShieldAlert, Percent,
  Calendar, FileText, FileBarChart, Users, Layers, Package, TrendingUpDown, CircleArrowUp, CircleArrowDown,
  BanknoteIcon as Banknote, ChartNoAxesCombined, BadgeDollarSign, MessageSquare, Bell, Hash, Megaphone
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

interface ElementStyle {
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  top?: string;
  left?: string;
  width?: string;
  height?: string; // for shapes
  textAlign?: "left" | "right" | "center";
  opacity?: number;
  letterSpacing?: string;
  lineHeight?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  size?: string; // for icons
}

interface SlideElement {
    type: "text" | "icon" | "image" | "shape";
    content?: string; // for text
    name?: string; // for icon
    url?: string; // for image
    style: ElementStyle;
    shapeType?: "circle" | "rect" | "line";
}

interface StoryDesign {
    design_system: {
        font_family: string;
        primary_color: string;
        accent_color: string;
        background_gradient: {
            start: string;
            end: string;
            direction: string;
        };
    };
    slides: {
        elements: SlideElement[];
    }[];
}

interface Story {
  id: string;
  ticker: string;
  stock_name: string;
  change: string;
  price: number;
  news?: { title: string; source: string; time: string; link: string };
  design: StoryDesign; 
  timestamp: string;
}

interface StoryPlayerProps {
  stories: Story[];
  initialStoryIndex: number;
  onClose: () => void;
}

const DURATION = 5000;

// dynamically loads googlefont
const FontLoader = ({ fontFamily }: { fontFamily: string }) => {
    useEffect(() => {
        if (!fontFamily) return;
        const linkId = `font-${fontFamily.replace(/\s+/g, '-')}`;
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;700;900&display=swap`;
            document.head.appendChild(link);
        }
    }, [fontFamily]);
    return null;
};

// renders specific elements
const RenderElement = ({ el, ticker, font }: { el: SlideElement, ticker: string, font: string }) => {
    
    // icon map
    const icons: any = { 
      Rocket, TrendingUp, TrendingDown, AlertTriangle, Zap, Activity, Info, Flame, Droplets, Anchor, Mountain, Skull, Trophy, Star,
      DollarSign, BarChart, BarChart2, BarChart3, LineChart, PieChart, CircleDollarSign, Coins, Wallet, CreditCard,
      Building, Building2, Store, Globe, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight, Briefcase, Target,
      Clock, CheckCircle, XCircle, Sparkles, Crown, Eye, Lock, Unlock, ShieldCheck, ShieldAlert, Percent,
      Calendar, FileText, FileBarChart, Users, Layers, Package, TrendingUpDown, CircleArrowUp, CircleArrowDown,
      Banknote, ChartNoAxesCombined, BadgeDollarSign, MessageSquare, Bell, Hash, Megaphone
    };
    
    // layers
    const layerZIndex = { shape: 0, image: 5, icon: 10, text: 20 };

    const topVal = el.style.top || '10%';
    const leftVal = el.style.left || '5%';
    const leftNum = parseFloat(leftVal);
    
    // for icons/shapes, allow centering if left >= 35%
    const shouldCenterX = el.type !== 'text' && leftNum >= 35;

    // force safe positioning 
    if (el.type === "text") {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: el.style.opacity ?? 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{
                    position: 'absolute',
                    top: topVal,
                    left: '5%',  // force left margin 
                    width: '90%', // force safe width
                    textAlign: el.style.textAlign || 'center',
                    opacity: el.style.opacity ?? 1,
                    zIndex: layerZIndex.text,
                    fontSize: el.style.fontSize || '1rem',
                    fontWeight: el.style.fontWeight || 'normal',
                    color: el.style.color || 'white',
                    fontFamily: font,
                    letterSpacing: el.style.letterSpacing || 'normal',
                    lineHeight: el.style.lineHeight || 1.4,
                    textTransform: el.style.textTransform || 'none',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)', 
                }}
            >
                {el.content}
            </motion.div>
        );
    }
    
    // icon eleemtns
    if (el.type === "icon") {
        const Icon = icons[el.name || "Activity"] || Activity;
        const iconLeftNum = parseFloat(el.style.left || '50%');
        const iconShouldCenter = iconLeftNum >= 35;
        
        return (
             <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                style={{
                    position: 'absolute',
                    top: topVal,
                    left: iconShouldCenter ? '50%' : leftVal,
                    transform: iconShouldCenter ? 'translateX(-50%)' : 'none',
                    zIndex: layerZIndex.icon,
                    color: el.style.color || 'white',
                }}
             >
                 <Icon size={parseInt(el.style.size || "48")} />
             </motion.div>
        );
    }

    // shape elements
    if (el.type === "shape") {
        const shapeLeftNum = parseFloat(el.style.left || '50%');
        const shapeShouldCenter = shapeLeftNum >= 35;
        
        return (
             <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: el.style.opacity ?? 0.08 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                    position: 'absolute',
                    top: topVal,
                    left: shapeShouldCenter ? '50%' : leftVal,
                    transform: shapeShouldCenter ? 'translateX(-50%)' : 'none',
                    zIndex: layerZIndex.shape,
                    width: el.style.width || '300px',
                    height: el.style.height || el.style.width || '300px',
                    backgroundColor: el.style.color || 'rgba(255,255,255,0.05)',
                    borderRadius: el.shapeType === 'circle' ? '50%' : '0',
                    filter: 'blur(1px)',
                }} 
             />
        )
    }

    return null;
};

export default function StoryPlayer({ stories, initialStoryIndex, onClose }: StoryPlayerProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(0);

  const story = stories[currentStoryIndex];
  
  if (!story) return null; 

  const defaultDesign = {
      design_system: { 
          font_family: 'Inter', 
          primary_color: '#fff', 
          accent_color: '#fff', 
          background_gradient: { start: '#09090b', end: '#18181b', direction: 'to bottom' } 
      },
      slides: []
  };

  const design = story.design ? {
      ...defaultDesign,
      ...story.design,
      design_system: {
          ...defaultDesign.design_system,
          ...(story.design.design_system || {})
      }
  } : defaultDesign;

  const slides = design.slides || [];
  const currentSlide = slides[currentSlideIndex];

  // auto-advance
  useEffect(() => {
    if (isPaused || !slides.length) return;

    const interval = 50; 
    const step = (100 * interval) / DURATION;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextSlide();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentSlideIndex, currentStoryIndex, isPaused, slides.length]);

  // key commands
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNextSlide();
      if (e.key === "ArrowLeft") handlePrevSlide();
      if (e.key === " ") setIsPaused((p) => !p);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex, currentStoryIndex]);

  const handleNextSlide = () => {
    setDirection(1);
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      if (currentStoryIndex < stories.length - 1) {
        setCurrentStoryIndex((prev) => prev + 1);
        setCurrentSlideIndex(0);
        setProgress(0);
      } else {
        onClose();
      }
    }
  };

  const handlePrevSlide = () => {
    setDirection(-1);
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex((prev) => prev - 1);
        setCurrentSlideIndex(0); 
        setProgress(0);
      }
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-0">
      
      {/* dynamic font loader */}
      <FontLoader fontFamily={design.design_system.font_family} />

      <div 
        className="relative w-full max-w-md aspect-9/16 md:h-[80vh] md:w-auto md:aspect-9/16 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{
            background: `linear-gradient(${design.design_system.background_gradient.direction}, ${design.design_system.background_gradient.start}, ${design.design_system.background_gradient.end})`
        }}
      >
        {/* background image */}
         <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
             <img
                src={`https://files.marketindex.com.au/xasx/96x96-png/${story.ticker.toLowerCase()}.png`}
                className="w-full h-full object-cover blur-xl scale-150 grayscale"
            />
        </div>

        {/* header */}
        <div className="absolute top-6 left-0 right-0 px-4 z-30 flex justify-between items-center text-white/80">
          <div className="flex items-center gap-2">
            <img
                src={`https://files.marketindex.com.au/xasx/96x96-png/${story.ticker.toLowerCase()}.png`}
                className="w-6 h-6 rounded-full bg-white/10"
            />
            <span className="font-bold text-sm font-sans">{story.ticker}</span>
            <span className="text-xs opacity-60 font-sans">AI GENERATED</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* progress bars */}
        <div className="absolute top-0 left-0 right-0 p-3 z-30 flex gap-1">
          {Array.from({ length: slides.length }).map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width: i < currentSlideIndex ? "100%" : i === currentSlideIndex ? `${progress}%` : "0%"
                }}
              />
            </div>
          ))}
        </div>

        {/* tap interactions */}
        <div className="absolute inset-0 z-20 grid grid-cols-3">
          <div className="col-span-1" onClick={handlePrevSlide} />
          <div 
            className="col-span-1" 
            onMouseDown={() => setIsPaused(true)} 
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
          <div className="col-span-1" onClick={handleNextSlide} />
        </div>

        {/* renderer engine */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${story.id}-${currentSlideIndex}`}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 z-10 overflow-hidden"
          >
              {currentSlide?.elements.map((el, i) => (
                  <RenderElement 
                    key={i} 
                    el={el} 
                    ticker={story.ticker} 
                    font={design.design_system.font_family} 
                  />
              ))}

              {/* always show CTA on last slide */}
              {currentSlideIndex === slides.length - 1 && (
                  <div className="absolute bottom-10 left-0 right-0 px-8 flex flex-col gap-3 z-50">
                       <Link href={`/stock/${story.ticker}`} className="block w-full">
                        <button className="w-full py-4 bg-white text-black font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-sans">
                            View Stock Details <ExternalLink size={16} />
                        </button>
                    </Link>
                  </div>
              )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
