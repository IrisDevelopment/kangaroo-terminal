"use client";
import { API_URL, apiFetch } from "@/lib/api";
import { useSidebar } from "@/context/SidebarContext";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isMobile } = useSidebar();
  const notifiedIds = useRef<Set<number>>(new Set());

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // play sound helper
  const playAlertSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/assets/ping.mp3");
        audioRef.current.volume = 0.5;
      }

      // reset if already playing
      audioRef.current.currentTime = 0;

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          // ignore common browser-blocked audio errors
          if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
            console.error("Audio play failed", e);
          }
        });
      }
    } catch (e) {
      console.error("Audio internal error", e);
    }
  };

  useEffect(() => {
    let isFirstCheck = true;

    const checkAlerts = async () => {
      try {
        const res = await apiFetch(`${API_URL}/alerts/triggered`);
        if (!res.ok) return;
        const alerts = await res.json();

        let hasNew = false;
        alerts.forEach((alert: any) => {
          if (!notifiedIds.current.has(alert.id)) {
            notifiedIds.current.add(alert.id);

            toast(`PRICE ALERT: ${alert.ticker}`, {
              description: `Price is ${alert.condition} $${(alert.target_price ?? 0).toFixed(2)}`,
              icon: <BellRing className="text-red-500" size={18} />,
              duration: 10000,
            });

            hasNew = true;
          }
        });

        if (hasNew) {
          playAlertSound();
        }

        isFirstCheck = false;
      } catch (e) {
        console.error("Alert poll failed", e);
      }
    };

    // run immediately on mount
    checkAlerts();

    const interval = setInterval(checkAlerts, 5000); // check every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.main
      initial={{ marginLeft: isMobile ? "0rem" : "16rem" }}
      animate={{ marginLeft: isMobile ? "0rem" : isCollapsed ? "5rem" : "16rem" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 p-4 lg:p-8"
    >
      {children}
    </motion.main>
  );
}