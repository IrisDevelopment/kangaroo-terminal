import { Suspense } from "react";
import DashboardClient from "./components/DashboardClient";
import { Loader2 } from "lucide-react";

// force dynamic rendering
export const dynamic = "force-dynamic";

async function getStocks() {
  try {
    const res = await fetch("http://localhost:8000/stocks", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch stocks", error);
    return [];
  }
}

async function getGlobalMarkets() {
  try {
    const res = await fetch("http://localhost:8000/global-markets", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch global markets", error);
    return [];
  }
}

async function DashboardContent() {
  // parallel fetching
  const stocksData = getStocks();
  const marketsData = getGlobalMarkets();

  const [stocks, globalMarkets] = await Promise.all([stocksData, marketsData]);

  return (
      <DashboardClient 
        initialStocks={stocks} 
        initialGlobalMarkets={globalMarkets} 
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