import { Suspense } from "react";
import DashboardClient from "./components/DashboardClient";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

// force dynamic rendering
export const dynamic = "force-dynamic";

async function getStocks() {
  try {
    const res = await fetch(`${API_URL}/stocks`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch stocks", error);
    return [];
  }
}

async function getGlobalMarkets() {
  try {
    const res = await fetch(`${API_URL}/global-markets`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch global markets", error);
    return [];
  }
}

async function getSparklines() {
  try {
    const res = await fetch(`${API_URL}/stocks/sparklines`, { cache: "no-store" });
    if (!res.ok) return {};
    return res.json();
  } catch (error) {
    console.error("Failed to fetch sparklines", error);
    return {};
  }
}

async function DashboardContent() {
  // parallel fetching
  const stocksData = getStocks();
  const marketsData = getGlobalMarkets();
  const sparklinesData = getSparklines();

  const [stocks, globalMarkets, sparklines] = await Promise.all([stocksData, marketsData, sparklinesData]);

  return (
    <DashboardClient
      initialStocks={stocks}
      initialGlobalMarkets={globalMarkets}
      initialSparklines={sparklines}
    />
  );
}

export default function Home() {
  return (
    <main>
      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h2 className="text-4xl font-instrument text-white">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time market intelligence</p>
        </div>
      </div>

      {/* barrier */}
      <div className="h-px w-full bg-linear-to-r from-transparent via-primary/20 to-transparent mb-6 shadow-[0_0_10px_rgba(198,142,86,0.15)]"></div>

      <Suspense fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </main>
  );
}