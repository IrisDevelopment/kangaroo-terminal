"use client";
import { API_URL, apiFetch } from "@/lib/api";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AlertModalProps {
    ticker: string;
    currentPrice: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function AlertModal({ ticker, currentPrice, isOpen, onClose }: AlertModalProps) {
    const [targetPrice, setTargetPrice] = useState<string>(currentPrice.toString());
    const [condition, setCondition] = useState<"ABOVE" | "BELOW">("ABOVE");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await apiFetch(`${API_URL}/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker: ticker,
                    target_price: parseFloat(targetPrice),
                    condition: condition
                })
            });

            if (!res.ok) throw new Error('Failed to create alert');

            toast.success(`Alert set for ${ticker} ${condition === "ABOVE" ? "above" : "below"} $${targetPrice}`);
            onClose();
        } catch (err) {
            toast.error("Failed to create alert");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* modal */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="luxury-modal w-full max-w-md relative overflow-hidden"
                        >
                            {/* close button */}
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-6">
                                <h2 className="text-xl font-medium text-white">Set Alert</h2>
                                <p className="text-sm text-gray-400">Get notified when {ticker} hits a target.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1.5">Condition</label>
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-lg border border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => setCondition("ABOVE")}
                                            className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${condition === "ABOVE"
                                                ? "bg-primary text-white shadow-lg"
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            Above Target
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCondition("BELOW")}
                                            className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${condition === "BELOW"
                                                ? "bg-primary text-white shadow-lg"
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            Below Target
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1.5">Target Price ($)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={targetPrice}
                                            onChange={(e) => setTargetPrice(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-lg"
                                        />
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">
                                        Current Price: <span className="text-gray-300 font-mono">${currentPrice.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 luxury-button justify-center"
                                >
                                    {loading ? "Creating..." : "Create Alert"}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
