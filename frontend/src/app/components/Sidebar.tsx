"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    ScanLine,
    Newspaper,
    BrainCircuit,
    Activity
} from "lucide-react";

// accepts label & icon
const NavItem = ({ href, label, icon: Icon, active, layoutId }: any) => (
  <Link
    href={href}
    prefetch={true}
    className={`relative flex items-center gap-3 px-4 py-3 mx-4 mb-2 rounded-xl transition-colors duration-200 group ${
      active
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
    <Icon size={18} className={`relative z-10 ${active ? "text-primary" : "text-gray-500 group-hover:text-white"}`} />
    <span className="relative z-10 font-medium text-sm tracking-wide">{label}</span>
  </Link>
);

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-white/5 flex flex-col z-50">
      {/* logo area */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          {/* logo image */}
          <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden shadow-[0_0_12px_rgba(198,142,86,0.4)] border border-white/10 relative">
            <img
              src="/assets/circle.png"
              alt="Kangaroo Terminal Logo"
              className="w-full h-full object-cover scale-140"
            />
          </div>

          <h1 className="text-[1.7rem] font-instrument tracking-tight bg-linear-to-br via-stone-200 bg-clip-text text-transparent drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.5)]">
            KangarooTerminal
          </h1>
        </div>
      </div>

      {/* nav links */}
      <nav className="flex-1 mt-4">
        <div className="px-6 mb-2 text-xs font-bold text-gray-700 uppercase tracking-wider">Menu</div>
        <NavItem href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} layoutId="nav-highlight" />
        <NavItem href="/screener" label="Discover" icon={ScanLine} active={pathname === "/screener"} layoutId="nav-highlight" />
        <NavItem href="/news" label="Market News" icon={Newspaper} active={pathname === "/news"} layoutId="nav-highlight" />
        
        <div className="px-6 mb-2 mt-6 text-xs font-bold text-gray-700 uppercase tracking-wider">Intelligence</div>
        <NavItem href="/ai" label="AI Analyst" icon={BrainCircuit} active={pathname === "/ai"} layoutId="nav-highlight" />
      </nav>

      {/* status */}
      <div className="p-6">
        <div className="luxury-card p-4 rounded-xl flex items-center gap-3">
          <div className="relative">
            <Activity size={16} className="text-success" />
            <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-success animate-pulse -mr-1 -mt-1 shadow-[0_0_10px_#4E9F76]"></div>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Scraper Status</p>
            <p className="text-[10px] text-success tracking-wider uppercase font-bold">Operational</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
