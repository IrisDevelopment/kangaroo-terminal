"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Play, AlertTriangle, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, CartesianGrid, ReferenceLine } from "recharts";
import { toast } from "sonner";

interface SimulationClientProps {
    ticker: string;
    initialHistory: any[];
}

export default function SimulationClient({ ticker, initialHistory }: SimulationClientProps) {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [balance, setBalance] = useState(10000); // starting capital

    const runSimulation = async (inputHistory?: any[]) => {
        setLoading(true);
        try {
            let history = inputHistory;
            // fetch history if not provided (re-run)
            if (!history) {
                const res = await fetch(`http://localhost:8000/stock/${ticker}/history?period=2y`);
                if (!res.ok) throw new Error("Failed to fetch data");
                history = await res.json();
            }
            
            // allow time for "Processing" UI effect
            await new Promise(r => setTimeout(r, 1000));

            // calculate Buy & Hold for comparison
            if (!history || history.length === 0) throw new Error("No history data");
            const startPrice = history[0].close;
            const buyHoldShares = 10000 / startPrice;

            let cash = 10000;
            let shares = 0;
            const trades = [];
            const equityCurve = [];
            
            for (let i = 0; history && i < history.length; i++) {
                const day = history[i];
                const price = day.close;
                
                // format date for display
                // backend returns either YYYY-MM-DD string or Unix Interval
                const dateLabel = typeof day.time === 'number' 
                    ? new Date(day.time * 1000).toLocaleDateString() 
                    : day.time;

                // bollinger band strategy
                if (day.bb_lower && price < day.bb_lower && cash > 0) {
                    // BUY
                    const qty = Math.floor(cash / price);
                    if (qty > 0) {
                        shares += qty;
                        cash -= qty * price;
                        trades.push({ type: "BUY", price, date: dateLabel });
                    }
                } else if (day.bb_upper && price > day.bb_upper && shares > 0) {
                    // SELL
                    cash += shares * price;
                    shares = 0;
                    trades.push({ type: "SELL", price, date: dateLabel });
                }
                
                equityCurve.push({
                    date: dateLabel, 
                    value: cash + (shares * price),
                    buyHold: buyHoldShares * price
                });
            }

            const finalEquity = equityCurve[equityCurve.length - 1].value;
            const returnPct = ((finalEquity - 10000) / 10000) * 100;
            
            const finalBuyHold = equityCurve[equityCurve.length - 1].buyHold;
            const bhReturnPct = ((finalBuyHold - 10000) / 10000) * 100;

            setResults({
                initial: 10000,
                final: finalEquity,
                returnPct,
                bhReturnPct,
                trades: trades.length,
                chart: equityCurve,
                ticker
            });

        } catch (e) {
            toast.error("Simulation Failed", { description: "Could not run strategy on this asset." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (Array.isArray(initialHistory) && initialHistory.length > 0) {
            runSimulation(initialHistory);
        } else {
            runSimulation();
        }
    }, [ticker, initialHistory]);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl text-white font-instrument mb-1">Strategy Simulator</h1>
                    <p className="text-gray-400">Backtesting Engine: Bollinger Reversion ({ticker})</p>
                </div>
                <button 
                    onClick={() => runSimulation()}
                    disabled={loading}
                    className="luxury-button"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <RefreshCcw size={18} />}
                    <span>Rerun Test</span>
                </button>
            </header>

            {loading ? (
                <div className="h-96 flex flex-col items-center justify-center space-y-4">
                    <Loader2 size={48} className="text-primary animate-spin" />
                    <p className="text-white font-mono animate-pulse">Running Historical Simulation...</p>
                </div>
            ) : results ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* stats card */}
                    <div className="luxury-card p-6 rounded-2xl border border-white/5 space-y-6">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Return</p>
                            <h2 className={`text-4xl font-bold font-mono ${results.returnPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {results.returnPct > 0 ? "+" : ""}{results.returnPct.toFixed(2)}%
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 font-mono">
                                Buy & Hold: <span className={results.bhReturnPct >= 0 ? "text-green-400" : "text-red-400"}>
                                    {results.bhReturnPct > 0 ? "+" : ""}{results.bhReturnPct.toFixed(2)}%
                                </span>
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase">Trades Executed</p>
                                <p className="text-2xl font-bold text-white">{results.trades}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase">Final Equity</p>
                                <p className="text-2xl font-bold text-white">${results.final.toFixed(0)}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-xs text-slate-400 leading-relaxed">
                                <span className="text-primary font-bold">Strategy Logic:</span> Buy when price closes below Lower Bollinger Band (20, 2). Sell when price closes above Upper Bollinger Band.
                            </p>
                        </div>
                    </div>

                    {/* chart */}
                    <div className="lg:col-span-2 luxury-card p-6 rounded-2xl border border-white/5 h-100">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Equity Curve</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={results.chart}>
                                <defs>
                                    <linearGradient id="gEquity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={results.returnPct >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={results.returnPct >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" hide />
                                <YAxis domain={['auto', 'auto']} stroke="#666" fontSize={12} tickFormatter={(val) => `$${val}`} />
                                <ReTooltip 
                                    contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                                    formatter={(value: any, name?: string) => [`$${(value as number).toFixed(2)}`, name ?? ""]}
                                    labelStyle={{ color: '#888', marginBottom: '0.5rem' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="buyHold" 
                                    stroke="#475569" 
                                    strokeWidth={2} 
                                    strokeDasharray="4 4" 
                                    fill="transparent" 
                                    name="Buy & Hold"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={results.returnPct >= 0 ? "#22c55e" : "#ef4444"} 
                                    strokeWidth={3} 
                                    fill="url(#gEquity)" 
                                    name="Strategy"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 py-20">
                    <AlertTriangle className="mx-auto mb-4" />
                    No simulation data generated.
                </div>
            )}
        </div>
    );
}
