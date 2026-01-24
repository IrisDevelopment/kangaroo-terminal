"use client";
import { useEffect, useState } from "react";
import { Loader2, Radar, Target, ArrowRight, Zap, Play, AlertOctagon, Info } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const SignalCard = ({ item }: any) => {
  const router = useRouter();

  const handleTest = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      toast.success(`Initializing Backtest for ${item.ticker}...`);
      router.push(`/simulation?ticker=${item.ticker}`); 
  }

  // calculate stars based on score (1-5)
  const stars = Math.min(5, (item.score || 1));

  return (
    <Link href={`/stock/${item.ticker}`} className="block">
        <div className="luxury-card p-4 rounded-xl border border-white/5 hover:border-primary/50 transition-all hover:-translate-y-1 group relative overflow-hidden">
            
            {/* whale alert badge */}
            {item.signals.includes("WHALE_ALERT") && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl shadow-lg z-20 flex items-center gap-1">
                    <AlertOctagon size={10} /> 
                    <span>WHALE ALERT</span>
                    <div className="relative flex items-center">
                        <Info size={12} className="ml-1 cursor-help peer hover:scale-110 transition-transform" />
                        <div className="absolute top-full right-0 mt-3 w-48 bg-[#1A110D] border border-orange-500/30 p-3 rounded-xl shadow-2xl opacity-0 peer-hover:opacity-100 transition-all duration-300 z-50 pointer-events-none translate-y-2 peer-hover:translate-y-0 text-left">
                            <div className="flex items-center gap-2 mb-2 text-primary">
                                <AlertOctagon size={12} />
                                <span className="font-bold text-[10px] uppercase">Unusual Volume</span>
                            </div>
                            <p className="text-[10px] text-gray-300 font-medium normal-case leading-relaxed">
                                Institutional buying detected (200%+ of average volume). Smart money is entering this position.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <img 
                        src={`https://files.marketindex.com.au/xasx/96x96-png/${item.ticker.toLowerCase()}.png`}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                        className="w-10 h-10 rounded-full bg-white p-[1px] object-cover"
                    />
                    <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{item.ticker}</h3>
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Zap 
                                    key={i} 
                                    size={10} 
                                    className={i < stars ? "fill-primary text-primary" : "text-gray-800 fill-gray-800"} 
                                />
                            ))}
                        </div>
                    </div>
                </div>
                {/* rsi badge */}
                <div className={`mt-6 px-2 py-1 rounded text-[10px] font-bold font-mono ${item.rsi < 30 ? "bg-green-500/10 text-green-400" : item.rsi > 70 ? "bg-red-500/10 text-red-400" : "bg-gray-800 text-gray-400"}`}>
                    RSI {item.rsi}
                </div>
            </div>

            {/* signals list */}
            <div className="space-y-2 mb-4">
                {item.signals.map((sig: string) => (
                    <div key={sig} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border ${
                        sig === "GOLDEN_CROSS" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
                        sig === "DEATH_CROSS" ? "bg-red-500/10 border-red-500/30 text-red-500" :
                        sig === "RSI_OVERSOLD" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                        sig === "RSI_OVERBOUGHT" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                        sig === "WHALE_ALERT" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                        "bg-gray-500/10 border-gray-500/30 text-gray-400"
                    }`}>
                        <Zap size={12} className="fill-current" />
                        {sig.replace(/_/g, " ")}
                    </div>
                ))}
            </div>

            {/* test this button */}
            <button 
                onClick={handleTest}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-primary hover:text-black text-gray-400 py-2 rounded-lg text-xs font-bold transition-colors border border-white/5"
            >
                <Play size={10} /> Test This Setup
            </button>
        </div>
    </Link>
  );
};

interface HunterClientProps {
    initialResults: any[];
}

export default function HunterClient({ initialResults }: HunterClientProps) {
  const [results, setResults] = useState<any[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(true);

  const runScan = async () => {
    setLoading(true);
    setResults([]);
    try {
        const res = await fetch("http://localhost:8000/scanner/run");
        const data = await res.json();
        setResults(data);
        setHasScanned(true);
    } catch (e) {
        console.error(e);
        toast.error("Scanner failed to connect");
    } finally {
        setLoading(false);
    }
  };

  // initial scan handled by server
  // useEffect(() => { runScan(); }, []);

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* hero section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-linear-to-r from-primary/10 to-transparent p-8 rounded-3xl border border-primary/20 relative overflow-hidden">
        <div className="relative z-10">
            <h1 className="text-5xl text-white font-instrument mb-4">Signal Hunter</h1>
            <p className="text-gray-300 max-w-lg text-lg">
                Scanning the ASX 200 for high-probability technical setups...
            </p>
        </div>
        
        {/* decor */}
        <div className="relative z-10 p-4 bg-[#0F0B08] rounded-full border border-white/10 shadow-2xl">
            {loading ? (
                 <Loader2 size={120} className="text-primary animate-spin" />
            ) : (
                <Target size={120} className="text-primary animate-pulse" />
            )}
        </div>
        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-10"></div>
      </div>

      {/* results grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 size={48} className="text-primary animate-spin" />
            <p className="text-gray-500 font-mono animate-pulse">Analysing market structure...</p>
        </div>
      ) : hasScanned && (
          <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-lg font-bold text-white uppercase flex items-center">
                    Active Signals Found
                  </h3>
                  <span className="text-primary font-mono font-bold">{results.length}</span>
              </div>

              {results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">                      {results.map((item) => (
                          <SignalCard key={item.ticker} item={item} />
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-20 text-gray-500">
                      <p>No signals detected. The market is quiet.</p>
                  </div>
              )}
          </div>
      )}
    </div>
  );
}