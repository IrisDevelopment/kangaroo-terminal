"use client";
import { API_URL, apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Globe, Loader2, RefreshCw } from "lucide-react";

export default function EconomicRadar() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCalendar = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`${API_URL}/macro/calendar`);
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
            <div className="flex items-center justify-between mb-4">
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

            <div className="w-full overflow-x-auto pb-4 custom-scrollbar select-none">
                <div className="flex gap-8 w-max px-1">
                    {loading && events.length === 0 ? (
                        <div className="flex items-center gap-4 py-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="luxury-card w-45 h-22.5 flex items-center justify-center border-dashed opacity-50">
                                    <Loader2 className="animate-spin text-primary" size={20} />
                                </div>
                            ))}
                        </div>
                    ) : events.length > 0 ? (
                        // group by time 
                        (() => {
                            // get time category
                            const getTimeCategory = (dateStr: string) => {
                                const eventDate = new Date(dateStr);
                                const now = new Date();
                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const tomorrow = new Date(today);
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                const weekFromNow = new Date(today);
                                weekFromNow.setDate(weekFromNow.getDate() + 7);
                                const monthFromNow = new Date(today);
                                monthFromNow.setMonth(monthFromNow.getMonth() + 1);

                                const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

                                if (eventDateOnly.getTime() === today.getTime()) return "Today";
                                if (eventDateOnly.getTime() === tomorrow.getTime()) return "Tomorrow";
                                if (eventDateOnly < weekFromNow) return "This Week";
                                if (eventDateOnly < monthFromNow) return "Next Week";
                                return "This Month";
                            };

                            const grouped = events.reduce((acc: any, evt: any) => {
                                const category = getTimeCategory(evt.date);
                                if (!acc[category]) acc[category] = [];
                                acc[category].push(evt);
                                return acc;
                            }, {});

                            // define order for time categories
                            const categoryOrder = ["Today", "Tomorrow", "This Week", "Next Week", "This Month"];
                            const sortedCategories = categoryOrder.filter(cat => grouped[cat]);

                            return sortedCategories.map((category: string) => {
                                const items = grouped[category];
                                return (
                                    <div key={category} className="relative flex flex-col">
                                        {/* time category label */}
                                        <div className="relative z-10 -mb-2 self-start">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2.5 py-0.5 bg-[#0a0a0a] border border-white/10 rounded-md">
                                                {category}
                                            </span>
                                        </div>

                                        {/* container with events */}
                                        <div className="flex gap-4 p-2 bg-white/2 rounded-lg border border-white/5">
                                            {items.map((evt: any, i: number) => (
                                                <div key={i} className="luxury-card relative w-45 h-22.5 rounded-xl border border-white/5 overflow-hidden group shrink-0 transition-transform hover:-translate-y-1 p-3">
                                                    {/* impact glow */}
                                                    <div className={`absolute top-0 right-0 w-12 h-12 opacity-10 pointer-events-none blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 ${evt.impact === "High" ? "bg-red-500" :
                                                        evt.impact === "Medium" ? "bg-orange-500" :
                                                            "bg-yellow-500"
                                                        }`} />

                                                    <div className="relative z-10 flex flex-col justify-between h-full">
                                                        {/* header */}
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-1.5 flex-1">
                                                                <span className="text-sm leading-none">{getFlag(evt.country)}</span>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] text-gray-500 uppercase font-mono leading-none">{evt.time}</span>
                                                                    <h4 className="text-[10px] font-bold text-gray-200 leading-tight mt-0.5 line-clamp-2 group-hover:text-white transition-colors">
                                                                        {evt.title}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ml-2 ${evt.impact === "High" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                                                evt.impact === "Medium" ? "bg-orange-500" :
                                                                    "bg-yellow-500/50"
                                                                }`} title={evt.impact}></div>
                                                        </div>

                                                        {/* footer */}
                                                        <div className="flex justify-between items-end border-t border-white/5 pt-1.5">
                                                            <span className="text-[8px] uppercase font-bold text-gray-600 tracking-tighter">Forecast</span>
                                                            <span className="text-[10px] font-mono font-bold text-primary">{evt.forecast || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            });
                        })()
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
        </div>
    );
}
