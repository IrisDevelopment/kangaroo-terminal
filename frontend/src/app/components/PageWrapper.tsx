"use client";
import { useSidebar } from "@/context/SidebarContext";
import { motion } from "framer-motion";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <motion.main 
      // animate margin based on sidebar state
      initial={{ marginLeft: "16rem" }} // 16rem = w-64
      animate={{ marginLeft: isCollapsed ? "5rem" : "16rem" }} // 5rem = w-20
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 p-8"
    >
      {children}
    </motion.main>
  );
}