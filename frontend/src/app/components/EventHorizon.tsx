"use client";
import { API_URL, apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Calendar, DollarSign, Megaphone, BellPlus, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

export default function EventHorizon() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await apiFetch(`${API_URL}/calendar/upcoming`);
                const data = await res.json();
                setEvents(data);
            } catch (e) {
                console.error("Failed to fetch calendar", e);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const createReminder = async (event: any) => {
        try {
            const res = await apiFetch(`${API_URL}/alerts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticker: event.ticker,
                    target_price: 0, // placeholder
                    condition: "REMINDER", 
                    note: `${event.type === 'EARNINGS' ? 'Earnings' : 'Dividend'}: ${event.date}`
                })
            });
            toast.success(`Reminder set for ${event.ticker} ${event.type}`);
        } catch (e) {
            toast.error("Failed to set reminder");
        }
    };

    const getDaysMessage = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);

        // @ts-ignore
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Tomorrow";
        return `in ${diffDays} days`;
    };

    if (loading) return (
        <div className="luxury-card p-6 min-h-60 lg:min-h-112.5 h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" />
        </div>
    );

    return (
        <div className="luxury-card p-0 min-h-60 lg:min-h-112.5 h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {events.length > 0 ? events.map((evt, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group border border-transparent hover:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${evt.type === "EARNINGS" ? "bg-purple-500/10 text-purple-400" : "bg-green-500/10 text-green-400"}`}>
                                {evt.type === "EARNINGS" ? <Megaphone size={16} /> : <DollarSign size={16} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">{evt.ticker}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                        {evt.type === "EARNINGS" ? "REPORT" : "DIVIDEND"}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    {getDaysMessage(evt.date)} •
                                    <span className="text-white/40 flex items-center gap-1">
                                        {evt.note}
                                        {evt.note === "Estimated" && (
                                            <span className="relative inline-flex items-center">
                                                <Info size={10} className="cursor-help peer hover:scale-110 transition-transform" />
                                                <span className="absolute left-0 top-full mt-2 w-48 bg-[#1A110D] border border-orange-500/30 p-3 rounded-xl shadow-2xl opacity-0 peer-hover:opacity-100 transition-all duration-300 z-50 pointer-events-none translate-y-2 peer-hover:translate-y-0 text-left">
                                                    <div className="flex items-center gap-2 mb-2 text-primary">
                                                        <Calendar size={10} />
                                                        <span className="font-bold text-[9px] uppercase">Prediction Model</span>
                                                    </div>
                                                    <div className="text-[9px] text-gray-300 font-medium normal-case leading-relaxed">
                                                        Estimated based on historical dividend frequency (+6 months from last payment). Actual dates may vary.
                                                    </div>
                                                </span>
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => createReminder(evt)}
                            className="p-2 text-gray-600 hover:text-white hover:bg-white/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                            title="Remind Me"
                        >
                            <BellPlus size={16} />
                        </button>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-12 h-full text-center">
                        <div className="p-4 rounded-full bg-white/5 mb-4">
                            <Calendar size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No upcoming events</h3>
                        <p className="text-gray-500 text-sm px-4">Earnings and dividends for your watchlist will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
