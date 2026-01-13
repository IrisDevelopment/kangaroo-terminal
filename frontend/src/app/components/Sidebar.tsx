"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ScanLine,
    Newspaper,
    BrainCircuit,
    Activity
} from "lucide-react";

// accepts label & icon
const NavItem = ({ href, label, icon: Icon, active }: any) => (
  <Link
    href={href}
    // floating appearance (?)
    className={`flex items-center gap-3 px-4 py-3 mx-4 mb-2 rounded-xl transition-all duration-300 group ${
      active
        ? "nav-item-active" 
        : "text-gray-500 hover:text-white hover:bg-white/5"
    }`}
  >
    <Icon size={18} className={`${active ? "text-primary" : "text-gray-500 group-hover:text-white"}`} />
    <span className="font-medium text-sm tracking-wide">{label}</span>
  </Link>
);

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-white/5 flex flex-col z-50">
      {/* logo area */}
      <div className="p-8 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Kangaroo<span className="text-primary">Terminal</span>
          </h1>
        </div>
      </div>

      {/* nav links */}
      <nav className="flex-1 mt-4">
        <div className="px-6 mb-2 text-xs font-bold text-gray-700 uppercase tracking-wider">Menu</div>
        <NavItem href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} />
        <NavItem href="/screener" label="Discover" icon={ScanLine} active={pathname === "/screener"} />
        <NavItem href="/news" label="Market News" icon={Newspaper} active={pathname === "/news"} />
        
        <div className="px-6 mb-2 mt-6 text-xs font-bold text-gray-700 uppercase tracking-wider">Intelligence</div>
        <NavItem href="/ai" label="AI Analyst" icon={BrainCircuit} active={pathname === "/ai"} />
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
