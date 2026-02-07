"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";

const STORAGE_KEY = "k-terminal-display-mode-dismissed";
const COUNTDOWN_SECONDS = 5;

export default function DisplayModeModal() {
  const { isDisplayMode } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!isDisplayMode) return;

    // check if already dismissed this session
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (dismissed === "true") return;
    } catch {
      // sessionStorage not available
    }

    // show modal
    setIsOpen(true);
  }, [isDisplayMode]);

  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const handleClose = () => {
    if (countdown > 0) return;

    setIsOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-100 flex items-center justify-center p-4"
          >
            {/* modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="luxury-modal w-full max-w-md relative overflow-hidden font-mono"
            >

              <div className="pt-2">
                {/* header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">⚠️</span>
                  <h2 className="text-base font-bold text-yellow-300/90 tracking-wider">heads up!</h2>
                </div>
                <p className="text-[13px] text-gray-400 mb-5 leading-relaxed">
                  You&apos;re looking at a <span className="text-white">demo instance</span> of Kangaroo Terminal. 
                  This version of the site is limited - prices are simulated, trades won&apos;t execute, 
                  and your session is sandboxed to this browser.
                </p>

                {/* details */}
                <div className="bg-white/3 rounded-lg border border-white/5 p-3.5 mb-5 space-y-2.5 text-xs text-gray-500">
                  <div className="flex gap-2">
                    <span className="text-yellow-500/70 shrink-0">→</span>
                    <span>Prices move randomly, not from a live feed</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-yellow-500/70 shrink-0">→</span>
                    <span>Lots of backend functions are disabled</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-yellow-500/70 shrink-0">→</span>
                    <span>Everything resets when your session expires</span>
                  </div>
                </div>

                <p className="text-xs italic text-gray-400 mb-5 border-l-2 border-yellow-500/20 pl-3">
                    to use kangaroo with full functionality, you can <a href="https://github.com/chefpenguino/kangaroo-terminal" target="_blank" className="text-yellow-500 hover:text-yellow-400 underline decoration-yellow-500/30 underline-offset-2 transition-colors">download the repo from GitHub</a> and run it yourself                </p>

                {/* footer */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600">
                    {countdown > 0 ? `${countdown}s` : "ready"}
                  </span>

                  <button
                    onClick={handleClose}
                    disabled={countdown > 0}
                    className={`px-4 py-1.5 rounded text-xs font-bold tracking-wide uppercase transition-all ${
                      countdown > 0
                        ? "bg-white/5 text-gray-600 cursor-not-allowed"
                        : "bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 border border-yellow-500/20 hover:border-yellow-500/40"
                    }`}
                  >
                    {countdown > 0 ? "wait" : "understood"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
