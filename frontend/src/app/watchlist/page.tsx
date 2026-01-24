import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import WatchlistClient from "./WatchlistClient";

async function getWatchlist() {
  try {
    const res = await fetch("http://localhost:8000/watchlist", { cache: "no-store" });
    return await res.json();
  } catch (error) {
    return [];
  }
}

async function WatchlistContent() {
  const stocks = await getWatchlist();
  
  return (
    <WatchlistClient initialStocks={stocks} />
  );
}

export default function WatchlistPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
        <WatchlistContent />
    </Suspense>
  );
}
