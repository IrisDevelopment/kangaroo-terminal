"use client";
import { useEffect, useState } from "react";
import { Search, ArrowRight, Loader2, Trophy, AlertTriangle, BrainCircuit, Activity, Scaling, ArrowLeftRight } from "lucide-react";
import { 
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, CartesianGrid, 
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend 
} from "recharts";
import { toast } from "sonner";

// utils
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// components

const MetricRow = ({ label, val1, val2, format, invert = false }: any) => {
    // determine winner (higher is better, unless invert=true like for Debt or P/E)
    let win1 = false;
    if (val1 !== null && val2 !== null) {
        win1 = invert ? val1 < val2 : val1 > val2;
    }
    const win2 = val1 !== null && val2 !== null && !win1 && val1 !== val2;

    const formatVal = (v: any) => {
        if (!v && v !== 0) return "-";
        if (format === "percent") return `${(v * 100).toFixed(2)}%`;
        if (format === "currency") return `$${(v / 1000000000).toFixed(1)}B`;
        if (format === "number") return v.toFixed(2);
        return v;
    };

    return (
        <div className="grid grid-cols-3 py-3 border-b border-white/5 items-center hover:bg-white/5 transition-colors px-4 rounded-lg group">
            <div className={cn("text-left font-mono font-bold transition-all", win1 ? "text-primary text-base" : "text-gray-500 text-sm")}>
                {formatVal(val1)}
                {win1 && <Trophy size={10} className="inline ml-2 text-primary" />}
            </div>
            <div className="text-center text-[10px] text-gray-500 uppercase font-bold tracking-wider group-hover:text-white transition-colors">
                {label}
            </div>
            <div className={cn("text-right font-mono font-bold transition-all", win2 ? "text-primary text-base" : "text-gray-500 text-sm")}>
                {win2 && <Trophy size={10} className="inline mr-2 text-primary" />}
                {formatVal(val2)}
            </div>
        </div>
    );
};

export default function ComparePage() {
    const [t1, setT1] = useState("BHP");
    const [t2, setT2] = useState("RIO");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [chartMode, setChartMode] = useState<"perf" | "ratio">("perf"); 
    
    // ai state
    const [aiVerdict, setAiVerdict] = useState<string | null>(null);
    const [analysing, setanalysing] = useState(false);

    const fetchComparison = async () => {
        if (!t1 || !t2) return;
        setAiVerdict(null);
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/compare?t1=${t1}&t2=${t2}`);
            if (!res.ok) throw new Error("Stocks not found");
            const jsonData = await res.json();
            // backend returns { stock_1, stock_2, radar_data, correlation, winner }
            // mapped to state
            setData(jsonData);
        } catch (e) {
            toast.error("Comparison Failed", { description: "Check ticker symbols." });
        } finally {
            setLoading(false);
        }
    };

    const runAiComparison = async () => {
        if(!data) return;
        setanalysing(true);
        try {
            const res = await fetch("http://localhost:8000/compare/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ t1, t2 })
            });
            const json = await res.json();
            setAiVerdict(json.report);
        } catch (e) {
            toast.error("AI Analysis Failed", { description: "Kangaroo Neural Net offline." });
        } finally {
            setanalysing(false);
        }
    };

    // initial load
    useEffect(() => { fetchComparison(); }, []);

    // prepare chart data
    const prepChartData = () => {
        if (!data) return [];
        const s1 = data.stock_1?.history || []; 
        const dates = data.stock_1?.dates || [];
        const s2 = data.stock_2?.history || [];
        
        // find min length to avoid index errors
        const len = Math.min(s1.length, s2.length);
        
        return s1.slice(0, len).map((val: number, i: number) => ({
            date: dates[i],
            // performance mode: normalised % change
            s1_perf: ((val - s1[0]) / s1[0]) * 100,
            s2_perf: ((s2[i] - s2[0]) / s2[0]) * 100,
            // ratio mode: price 1 / price 2
            ratio: val / s2[i]
        }));
    };

    const chartData = prepChartData();

    return (
        <div className="animate-in fade-in duration-500 space-y-6 pb-20">
            
            {/* header & search */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-2">
                <div>
                    <h1 className="text-4xl text-white font-instrument mb-1">Arena Mode</h1>
                    <p className="text-gray-400">Head-to-head stock analysis & correlation engine.</p>
                </div>
                
                {/* search bar */}
                <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10 w-full md:w-auto">
                    <div className="relative">
                        <input 
                            value={t1} onChange={(e) => setT1(e.target.value.toUpperCase())}
                            className="w-24 bg-transparent text-center font-bold text-white outline-none placeholder:text-gray-600 focus:text-primary uppercase"
                            placeholder="TKR 1"
                        />
                    </div>
                    <span className="text-gray-600 font-bold">VS</span>
                    <div className="relative">
                        <input 
                            value={t2} onChange={(e) => setT2(e.target.value.toUpperCase())}
                            className="w-24 bg-transparent text-center font-bold text-white outline-none placeholder:text-gray-600 focus:text-primary uppercase"
                            placeholder="TKR 2"
                        />
                    </div>
                    <button 
                        onClick={fetchComparison}
                        disabled={loading}
                        className="p-3 bg-primary text-black rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all font-bold"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                    </button>
                </div>
            </div>

            {data && (
                <>
                {/* top cards: head to head */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* stock 1 */}
                    <div className="luxury-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-all" />
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-1">{data.stock_1.ticker}</h1>
                                <p className="text-gray-400 text-sm">{data.stock_1.company_name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-white">${data.stock_1.metrics?.price?.toFixed(2)}</p>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${data.stock_1.metrics.change > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                    {data.stock_1.metrics.change > 0 ? "+" : ""}{data.stock_1.metrics.change}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* stock 2 */}
                    <div className="luxury-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-1 h-full bg-secondary/50 group-hover:bg-secondary transition-all" />
                        <div className="flex justify-between items-start">
                            <div className="text-left">
                                <p className="text-2xl font-bold text-white">${data.stock_2.metrics?.price?.toFixed(2)}</p>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${data.stock_2.metrics.change > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                    {data.stock_2.metrics.change > 0 ? "+" : ""}{data.stock_2.metrics.change}%
                                </span>
                            </div>
                            <div className="text-right">
                                <h1 className="text-4xl font-bold text-white mb-1">{data.stock_2.ticker}</h1>
                                <p className="text-gray-400 text-sm">{data.stock_2.company_name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* correlation & radar section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-100">
                    
                    {/* radar chart */}
                    <div className="lg:col-span-2 luxury-card rounded-2xl border border-white/5 p-4 flex flex-col relative overflow-hidden">
                        <div className="absolute top-4 left-4 z-10">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity size={18} className="text-primary" />
                                X-Ray Comparison
                            </h3>
                        </div>
                        <div className="flex-1 w-full h-full min-h-75">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.radar_data}>
                                    <PolarGrid stroke="#333" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name={t1} dataKey="A" stroke="#00ff9d" strokeWidth={2} fill="#00ff9d" fillOpacity={0.3} />
                                    <Radar name={t2} dataKey="B" stroke="#9d00ff" strokeWidth={2} fill="#9d00ff" fillOpacity={0.3} />
                                    <Legend />
                                    <ReTooltip 
                                        contentStyle={{ backgroundColor: '#000', borderColor: '#333' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* correlation scorecard */}
                    <div className="luxury-card rounded-2xl border border-white/5 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
                        <div className={cn("absolute inset-0 opacity-10 blur-3xl", 
                            data.correlation.color === "red" ? "bg-red-500" : 
                            data.correlation.color === "green" ? "bg-green-500" : "bg-yellow-500"
                        )} />
                        
                        <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wide">Correlation Matrix</h3>
                        
                        <div className="relative mb-4">
                            <Activity size={64} className={cn("mb-2", 
                                data.correlation.color === "red" ? "text-red-500" : 
                                data.correlation.color === "green" ? "text-green-500" : "text-yellow-500"
                            )} />
                        </div>
                        
                        <div className="text-5xl font-bold text-white mb-2">
                            {data.correlation.score.toFixed(2)}
                        </div>
                        
                        <div className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", 
                             data.correlation.color === "red" ? "bg-red-500/20 text-red-500" : 
                             data.correlation.color === "green" ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                        )}>
                            {data.correlation.description}
                        </div>
                        
                        <p className="mt-6 text-xs text-gray-500 px-4">
                            Correlation coefficient calculated on last 6 months of daily close data.
                        </p>
                    </div>

                </div>

                {/* graph section */}
                <div className="luxury-card rounded-2xl border border-white/5 p-6 h-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Scaling size={18} className="text-primary" />
                                {chartMode === "perf" ? "Performance Overlay" : "Price Ratio Spread"}
                            </h3>
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                                <button 
                                    onClick={() => setChartMode("perf")}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${chartMode === "perf" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}
                                >
                                    % Return
                                </button>
                                <button 
                                    onClick={() => setChartMode("ratio")}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${chartMode === "ratio" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}
                                >
                                    Spread ({t1} ÷ {t2})
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartMode === "perf" ? (
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#00ff9d" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#9d00ff" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#9d00ff" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <ReTooltip 
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="s1_perf" stroke="#00ff9d" strokeWidth={2} fill="url(#g1)" name={t1} />
                                    <Area type="monotone" dataKey="s2_perf" stroke="#9d00ff" strokeWidth={2} fill="url(#g2)" name={t2} />
                                </AreaChart>
                            ) : (
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="gRatio" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <ReTooltip 
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="ratio" stroke="#ffffff" strokeWidth={2} fill="url(#gRatio)" name={`${t1}/${t2} Ratio`} />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* metrics table */}
                <div className="luxury-card rounded-2xl border border-white/5 p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <ArrowLeftRight size={18} className="text-primary" />
                        Fundamental Face-Off
                    </h3>
                    <div className="space-y-1">
                        <MetricRow label="P/E Ratio" val1={data.stock_1.metrics?.pe} val2={data.stock_2.metrics?.pe} format="number" invert />
                        <MetricRow label="Market Cap" val1={data.stock_1.metrics?.mkt_cap} val2={data.stock_2.metrics?.mkt_cap} format="currency" />
                        <MetricRow label="Div Yield" val1={data.stock_1.metrics?.div_yield} val2={data.stock_2.metrics?.div_yield} format="percent" />
                        <MetricRow label="Profit Margin" val1={data.stock_1.metrics?.profit_margin} val2={data.stock_2.metrics?.profit_margin} format="percent" />
                        <MetricRow label="Revenue Growth" val1={data.stock_1.metrics?.rev_growth} val2={data.stock_2.metrics?.rev_growth} format="percent" />
                    </div>
                </div>

                {/* AI VERDICT */}
                <div className="mt-8 flex justify-center">
                    <button 
                        onClick={runAiComparison}
                        disabled={analysing}
                        className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        {analysing ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                        {analysing ? "analysing Market Data..." : "Generate AI Verdict"}
                    </button>
                </div>

                {aiVerdict && (
                        <div className="luxury-card border border-white/10 rounded-2xl animate-in zoom-in duration-300 p-6 mt-8">
                        <h3 className="text-primary font-bold mb-4 flex items-center gap-2">
                            <BrainCircuit size={18} /> KANGAROO AI ANALYSIS
                        </h3>
                        <div 
                            className="text-gray-300 leading-relaxed markdown-content space-y-4"
                            dangerouslySetInnerHTML={{ __html: aiVerdict }}
                        />
                    </div>
                )}
                </>
            )}
        </div>
    );
}