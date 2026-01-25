"use client";
import { useEffect, useState } from "react";
import { Globe, Loader2, RefreshCw } from "lucide-react";

export default function EconomicRadar() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCalendar = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/macro/calendar");
            const data = await res.json();
            setEvents(data);
        } catch (e) {
            console.error("Failed to fetch macro calendar", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendar();
    }, []);

    // helper for traffic light colors
    const getImpactColor = (impact: string) => {
        const i = impact.toLowerCase();
        if (i === "high") return "bg-red-500/20 text-red-400 border-red-500/30";
        if (i === "medium") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"; // low
    };

    // helper for flag (emoji based on currency code)
    const getFlag = (currency: string) => {
        const map: any = {
            AUD: "🇦🇺", USD: "🇺🇸", CNY: "🇨🇳", EUR: "🇪🇺", JPY: "🇯🇵", GBP: "🇬🇧", NZD: "🇳🇿"
        };
        return map[currency] || "🌍";
    };

    return (
        <div className="w-full relative group">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-instrument text-white">Economic Radar</h2>


                <button
                    onClick={fetchCalendar}
                    disabled={loading}
                    className="p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-all border border-white/5"
                    title="Refresh Pulse"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin text-primary" : ""} />
                </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar select-none no-scrollbar">
                {loading && events.length === 0 ? (
                    <div className="flex items-center gap-4 py-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="luxury-card w-64 h-24 flex items-center justify-center border-dashed opacity-50">
                                <Loader2 className="animate-spin text-primary" size={20} />
                            </div>
                        ))}
                    </div>
                ) : events.length > 0 ? (
                    <div className="flex gap-4">
                        {events.map((evt, i) => (
                            <div key={i} className="luxury-card w-64 p-4 shrink-0 transition-all hover:border-primary/30 group/item relative overflow-hidden">
                                {/* impact glow */}
                                <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 ${evt.impact === "High" ? "bg-red-500" :
                                    evt.impact === "Medium" ? "bg-orange-500" :
                                        "bg-yellow-500"
                                    }`} />

                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg leading-none">{getFlag(evt.country)}</span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-white leading-none">{evt.country}</span>
                                            <span className="text-[9px] text-gray-500 uppercase font-mono mt-0.5">{evt.date.slice(5)} • {evt.time}</span>
                                        </div>
                                    </div>
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${evt.impact === "High" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                        evt.impact === "Medium" ? "bg-orange-500" :
                                            "bg-yellow-500/50"
                                        }`} title={evt.impact}></div>
                                </div>

                                <h4 className="text-xs font-bold text-gray-200 leading-tight mb-2 line-clamp-1 group-hover/item:text-white transition-colors">
                                    {evt.title}
                                </h4>

                                <div className="flex justify-between items-end border-t border-white/5 pt-2">
                                    <span className="text-[9px] uppercase font-bold text-gray-600 tracking-tighter">Forecast</span>
                                    <span className="text-xs font-mono font-bold text-primary">{evt.forecast || "N/A"}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="luxury-card w-full py-8 flex flex-col items-center justify-center border-dashed">
                        {loading ? (
                            <Loader2 className="animate-spin text-primary mb-2" size={24} />
                        ) : (
                            <>
                                <Globe size={24} className="text-gray-600 mb-2" />
                                <p className="text-xs text-gray-500">Wait-listed or no macro events scheduled.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
