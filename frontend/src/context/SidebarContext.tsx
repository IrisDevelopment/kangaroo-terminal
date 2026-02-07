"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const MOBILE_BREAKPOINT = 1024;

type SidebarContextType = {
  isCollapsed: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  setCollapsed: (state: boolean) => void;
  closeMobileSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // auto-collapse on mobile
  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  const toggleSidebar = useCallback(() => setIsCollapsed((prev) => !prev), []);
  const setCollapsed = useCallback((state: boolean) => setIsCollapsed(state), []);

  // close sidebar on mobiel
  const closeMobileSidebar = useCallback(() => {
    if (isMobile) setIsCollapsed(true);
  }, [isMobile]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, isMobile, toggleSidebar, setCollapsed, closeMobileSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar should be used within a SidebarProvider");
  return context;
}