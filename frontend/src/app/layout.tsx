import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { Search } from "lucide-react"; // icons

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Kangaroo Terminal | ASX Intelligence",
    description: "Advanced financial analytics for the Aussie market.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className="flex min-h-screen bg-background text-text">
                    <Sidebar />
                    <main className="flex-1 ml-64 p-8">
                        <header className="flex justify-between items-center mb-10">
                            {/* search bar w icon */}
                            <div className="relative w-96 group">
                                <div className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-primary transition-colors">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search Ticker (e.g. BHP)..."
                                    className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors shadow-lg placeholder-gray-600 text-white"
                                />
                                <span className="absolute right-4 top-3.5 text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded border border-white/5">⌘ K</span>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="px-4 py-2 bg-surface rounded-full border border-white/5 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ASX Closed</span>
                                </div>
                            </div>
                        </header>
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}