"use client";
import { API_URL, apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ScanLine,
  Newspaper,
  BrainCircuit,
  Activity,
  ChevronLeft,
  ChevronRight,
  Star,
  Briefcase,
  Swords,
  Radar,
  RotateCw,
  Orbit,
  Scale,
  Settings
} from "lucide-react";

import { useSidebar } from "@/context/SidebarContext"
import { useSettings } from "@/context/SettingsContext"
import SettingsModal from "./SettingsModal"

// accepts label & icon
const NavItem = ({ href, label, icon: Icon, active, layoutId, collapsed, onNavigate }: any) => (
  <Link
    href={href}
    prefetch={true}
    onClick={onNavigate}
    className={`relative flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 mx-2 mb-2 rounded-xl transition-colors duration-200 group ${active
      ? "text-white"
      : "text-gray-500 hover:text-white hover:bg-white/5"
      }`}
  >
    {active && (
      <motion.div
        layoutId={layoutId}
        className="absolute inset-0 nav-item-active rounded-xl"
        initial={false}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      />
    )}
    <Icon size={20} className={`relative z-10 ${active ? "text-primary" : "text-gray-500 group-hover:text-white"}`} />

    {!collapsed && (
      <span className="relative z-10 font-medium text-sm tracking-wide whitespace-nowrap overflow-hidden">
        {label}
      </span>
    )}
  </Link>
);

export default function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobile, toggleSidebar, closeMobileSidebar } = useSidebar();
  const { settings } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [scraperStatus, setScraperStatus] = useState<any>({ status: "Offline", details: "Initialising..." });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiFetch(`${API_URL}/scraper-status`);
        if (res.ok) setScraperStatus(await res.json());
      } catch (e) {
        setScraperStatus({ status: "Offline", details: "Connection Error" });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, settings.scraperRefreshRate);
    return () => clearInterval(interval);
  }, [settings.scraperRefreshRate]);

  // close sidebar when route is changed
  useEffect(() => {
    closeMobileSidebar();
  }, [pathname]);

  const getStatusColor = () => {
    const s = scraperStatus.status?.toLowerCase() || "";
    if (s === "active" || s.includes("scraping")) return "text-success bg-success";
    if (s === "sleeping" || s === "standing by") return "text-primary bg-primary";
    if (s === "demo") return "text-yellow-400 bg-yellow-400";
    if (s === "closed") return "text-gray-500 bg-gray-500";
    return "text-danger bg-danger";
  };

  const colorClass = getStatusColor().split(" ")[0];
  const bgClass = getStatusColor().split(" ")[1];

  const sidebarOpen = isMobile ? !isCollapsed : true;
  const showExpanded = isMobile ? !isCollapsed : !isCollapsed;

  return (
    <>
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* sidebar */}
      <motion.aside
        initial={{ width: isMobile ? 256 : 256 }}
        animate={{
          width: showExpanded ? 256 : 80,
          x: isMobile && isCollapsed ? -256 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-screen bg-background border-r border-white/5 flex flex-col z-50 group/sidebar"
      >
        {/* toggle button */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className={`absolute -right-3 top-10 -translate-y-1/2 z-50 p-1.5 bg-surface border border-primary/40 rounded-full text-primary hover:text-white hover:border-primary hover:shadow-[0_0_15px_rgba(198,142,86,0.4)] transition-all duration-300 ${isCollapsed ? "top-10" : "top-11"}`}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        {/* logo area */}
        <div className={`py-6 flex ${showExpanded ? "px-5" : "justify-center px-0"}`}>
          <div className="flex items-center gap-2.5">
            {/* logo image */}
            <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden shadow-[0_0_12px_rgba(198,142,86,0.4)] border border-white/10 relative">
              <img
                src="/assets/circle.png"
                alt="Kangaroo Terminal Logo"
                className="w-full h-full object-cover scale-140"
              />
            </div>

            {showExpanded && (
              <h1
                className="text-[1.7rem] font-instrument tracking-tight bg-linear-to-br via-stone-200 bg-clip-text text-transparent drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.5)] whitespace-nowrap overflow-hidden">
                KangarooTerminal
              </h1>
            )}
          </div>
        </div>

        {/* nav links */}
        <nav className="flex-1 mt-4 overflow-y-auto custom-scrollbar">
          <Link
            href="/briefing"
            onClick={closeMobileSidebar}
            className={`relative flex items-center ${showExpanded ? "gap-3 px-4" : "justify-center px-2"} py-3 mx-2 mb-2 rounded-xl transition-all duration-300 group ${pathname === "/briefing"
              ? "bg-linear-to-r from-primary/20 to-transparent text-primary border border-primary/30 shadow-[0_0_15px_rgba(198,142,86,0.1)]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Newspaper size={20} className={`relative z-10 ${pathname === "/briefing" ? "text-primary animate-pulse" : "text-gray-500 group-hover:text-white"}`} />
            {showExpanded && (
              <span className="relative z-10 font-instrument text-base tracking-wide whitespace-nowrap overflow-hidden">
                Morning Note
              </span>
            )}
          </Link>
          <div className="h-4"></div>

          {showExpanded && <div className="px-6 mb-2 text-xs font-bold text-gray-700 uppercase tracking-wider animate-in fade-in">Monitor</div>}
          <NavItem href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />
          <NavItem href="/screener" label="Screener" icon={ScanLine} active={pathname === "/screener"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />
          <NavItem href="/watchlist" label="Watchlist" icon={Star} active={pathname === "/watchlist"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />
          <NavItem href="/portfolio" label="Portfolio" icon={Briefcase} active={pathname === "/portfolio"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />

          {showExpanded && <div className="px-6 mb-2 mt-6 text-xs font-bold text-gray-700 uppercase tracking-wider animate-in fade-in">Analysis</div>}
          <NavItem href="/hunter" label="Signal Hunter" icon={Radar} active={pathname === "/hunter"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />
          <NavItem href="/cycles" label="Cycle Engine" icon={RotateCw} active={pathname === "/cycles"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />
          <NavItem href="/galaxy" label="Market Galaxy" icon={Orbit} active={pathname === "/galaxy"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />
          <NavItem href="/rv" label="Relative Value" icon={Scale} active={pathname === "/rv"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />
          <NavItem href="/compare" label="Arena Mode" icon={Swords} active={pathname === "/compare"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />

          <NavItem href="/ai" label="AI Analyst" icon={BrainCircuit} active={pathname === "/ai"} layoutId="nav-highlight" collapsed={!showExpanded} onNavigate={closeMobileSidebar} />
        </nav>

        {/* status */}
        <div className="p-4">
          <div className={`luxury-card rounded-xl flex items-center gap-3 ${!showExpanded ? "p-2 justify-center" : "p-4"}`}>
            <div className="relative shrink-0">
              <Activity size={16} className={colorClass} />
              <div className={`absolute top-0 right-0 w-2 h-2 rounded-full ${bgClass} animate-pulse -mr-1 -mt-1 shadow-[0_0_10px_currentColor]`}></div>
            </div>

            {showExpanded && (
              <div className="overflow-hidden flex-1">
                <p className="text-xs text-gray-400 font-medium whitespace-nowrap">Scraper Status</p>
                <p className={`text-[10px] ${colorClass} tracking-wider uppercase font-bold whitespace-nowrap truncate`} title={scraperStatus.details}>
                  {scraperStatus.status}
                </p>
              </div>
            )}

            {/* settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-all ${!showExpanded ? "hidden" : ""}`}
              title="Settings"
            >
              <Settings size={14} />
            </button>
          </div>

          {/* settings button for collapsed state */}
          {!showExpanded && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full mt-2 p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-all flex justify-center"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        {/* settings modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </motion.aside>
    </>
  );
}
