"use client";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

// using luxury card class
const StockCard = ({ ticker, name, price, change, isPositive }: any) => (
  <div className="luxury-card group relative p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(198,142,86,0.1)]">
    
    {/* header */}
    <div className="flex justify-between items-start mb-6">
      <div className="flex items-center gap-3">
        {/* icon placeholder */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${isPositive ? 'bg-orange-500/10 text-orange-500' : 'bg-gray-700/30 text-gray-400'}`}>
           {ticker[0]}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white leading-none">{ticker}</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">{name}</p>
        </div>
      </div>
      
      {/* mini sparkline */}
      <div className="flex gap-0.5 items-end h-8 opacity-50">
        {[40, 60, 45, 70, 50, 80, 60, 85].map((h, i) => (
          <div key={i} style={{ height: `${h}%` }} className={`w-1 rounded-sm ${isPositive ? 'bg-success' : 'bg-danger'}`}></div>
        ))}
      </div>
    </div>
    
    {/* price area */}
    <div className="space-y-1">
      <span className="text-2xl font-bold tracking-tight text-white">{price}</span>
      
      <div className="flex items-center gap-2">
        <div className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${isPositive ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
          {isPositive ? <ArrowUpRight size={12} className="mr-1"/> : <ArrowDownRight size={12} className="mr-1"/>}
          {change}%
        </div>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Last 24h</span>
      </div>
    </div>
  </div>
);

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Overview</h2>
          {/* not really, just a placeholder for now LOL */}
          <p className="text-gray-500 text-sm mt-1">Real-time market intelligence</p> 
        </div>
        
        {/* global ticker for the asx200 */}
        <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
           <span>ASX200: <span className="text-white">$8,808.50</span></span>
           <span className="text-success">↑ 0.5%</span>
        </div>
      </div>

      {/* placeholder price data just for the sake of testing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StockCard ticker="BHP" name="BHP Group" price="45.23" change="1.2" isPositive={true} />
        <StockCard ticker="CBA" name="CommBank" price="112.50" change="0.4" isPositive={false} />
        <StockCard ticker="CSL" name="CSL Limited" price="290.10" change="0.8" isPositive={true} />
        <StockCard ticker="WBC" name="Westpac" price="24.15" change="1.1" isPositive={false} />
        <StockCard ticker="FMG" name="Fortescue" price="21.30" change="2.5" isPositive={true} />
        <StockCard ticker="RIO" name="Rio Tinto" price="125.80" change="0.1" isPositive={true} />
        <StockCard ticker="TLS" name="Telstra" price="3.95" change="0.2" isPositive={false} />
        <StockCard ticker="WOW" name="Woolworths" price="34.20" change="0.5" isPositive={false} />
      </div>
    </div>
  );
}