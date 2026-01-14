import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { Search } from "lucide-react"; // icons
import Header from "./components/Header";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter", 
});

const instrumentSerif = Instrument_Serif({
  weight: "400", 
  subsets: ["latin"],
  variable: "--font-instrument", 
});

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
            <body className={`${inter.variable} ${instrumentSerif.variable} font-sans antialiased`}>
                <div className="flex min-h-screen bg-background text-text">
                    <Sidebar />
                    <main className="flex-1 ml-64 p-8">
                        {/* Header.tsx */}
                        <Header />
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}