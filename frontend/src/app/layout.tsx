import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { Search } from "lucide-react"; // icons
import Header from "./components/Header";
import { SidebarProvider } from "@/context/SidebarContext";
import { RooProvider } from "@/context/RooContext";
import { SettingsProvider } from "@/context/SettingsContext";
import PageWrapper from "@/app/components/PageWrapper"
import StatusBar from "@/app/components/StatusBar";
import Roo from "./components/Roo";
import ThemedToaster from "./components/ThemedToaster";
import MotionWrapper from "./components/MotionWrapper";
import DisplayModeModal from "./components/DisplayModeModal";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-instrument",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

export const metadata: Metadata = {
    title: "Kangaroo Terminal | ASX Intelligence",
    description: "Advanced financial analytics for the Aussie market.",
    icons: {
        icon: "/assets/favicon.ico",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
                <SettingsProvider>
                    <MotionWrapper>
                        <SidebarProvider>
                            <RooProvider>
                                <div className="flex min-h-screen bg-background text-text">
                                    <Sidebar />
                                    <PageWrapper>
                                        <Header />
                                        <div className="pb-12">
                                            {children}
                                        </div>
                                        <StatusBar />
                                    </PageWrapper>
                                </div>
                                <Roo />
                                <ThemedToaster />
                                <DisplayModeModal />
                            </RooProvider>
                        </SidebarProvider>
                    </MotionWrapper>
                </SettingsProvider>
            </body>
        </html>
    );
}