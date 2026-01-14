"use client";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  // check market status upon load
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("http://localhost:8000/market-status");
        const data = await res.json();
        setIsOpen(data.is_open);
      } catch (e) {
        console.error("Failed to fetch market status");
      }
    };
    
    checkStatus();
    // re-check every minute
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex justify-between items-center mb-10">
      {/* search bar w icon */}
      <div className="relative w-96 group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search Ticker (e.g. BHP)..."
          className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors shadow-lg placeholder-gray-600 text-white"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded border border-white/5">
          ⌘ K
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* dynamic status indicator */}
        <div className={`px-4 py-2 bg-surface rounded-full border border-white/5 flex items-center gap-2 transition-colors ${isOpen ? 'shadow-[0_0_10px_rgba(78,159,118,0.2)]' : ''}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-success animate-pulse" : "bg-gray-500"}`}></span>
          <span className={`text-[14px] font-instrument uppercase tracking-wider ${isOpen ? "text-white" : "text-gray-500"}`}>
            {isOpen ? "ASX Open" : "ASX Closed"}
          </span>
        </div>
      </div>
    </header>
  );
}