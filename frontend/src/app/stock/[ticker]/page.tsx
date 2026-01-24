import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import StockDetailClient from "./StockDetailClient";

// helper for data fetching
async function getData(ticker: string) {
  const API_URL = "http://localhost:8000";
  
  // default to 1y data for initial load
  const period = "1y";
  const interval = "1d";

  try {
    const [
      historyRes,
      infoRes,
      newsRes,
      finRes,
      valRes,
      corpRes,
      instRes,
      stockDbRes
    ] = await Promise.all([
      fetch(`${API_URL}/stock/${ticker}/history?period=${period}&interval=${interval}`, { cache: "no-store" }),
      fetch(`${API_URL}/stock/${ticker}/info`, { next: { revalidate: 3600 } }), // cache info for 1 hour
      fetch(`${API_URL}/stock/${ticker}/news`, { cache: "no-store" }),
      fetch(`${API_URL}/stock/${ticker}/financials`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/stock/${ticker}/valuation`, { cache: "no-store" }),
      fetch(`${API_URL}/stock/${ticker}/corporate`, { next: { revalidate: 86400 } }), // cache corporate for 24h
      fetch(`${API_URL}/stock/${ticker}/institutional`, { next: { revalidate: 86400 } }),
      fetch(`${API_URL}/stock/${ticker}`, { cache: "no-store" })
    ]);

    if (historyRes.status === 404) return null;

    const [
      history,
      info,
      news,
      financials,
      valuation,
      corporate,
      institutional,
      stockDb
    ] = await Promise.all([
      historyRes.json(),
      infoRes.json(),
      newsRes.json(),
      finRes.json(),
      valRes.json(),
      corpRes.json(),
      instRes.json(),
      stockDbRes.json()
    ]);

    return {
      history,
      info,
      news,
      financials,
      valuation,
      corporate,
      institutional,
      isWatched: stockDb.is_watched
    };
  } catch (error) {
    console.error("Failed to fetch stock data:", error);
    return null;
  }
}

async function StockContent({ ticker }: { ticker: string }) {
  const data = await getData(ticker);

  if (!data) {
    notFound();
  }

  return (
    <StockDetailClient 
      ticker={ticker}
      initialHistory={data.history}
      initialInfo={data.info}
      initialNews={data.news}
      initialFinancials={data.financials}
      initialValuation={data.valuation}
      initialCorporate={data.corporate}
      initialInstitutional={data.institutional}
      initialIsWatched={data.isWatched}
    />
  );
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  
  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="text-gray-500 mt-4 animate-pulse">Analysing {ticker}...</p>
        </div>
    }>
        <StockContent ticker={ticker} />
    </Suspense>
  );
}
