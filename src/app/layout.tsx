import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { CloudRain, CheckSquare, Archive } from "lucide-react";
import Chatbot from "@/components/Chatbot";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aplikasi TAF BMKG",
  description: "TAF Generator & Validator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.className} bg-slate-50 text-slate-900 flex h-screen overflow-hidden`}
      >
        {/* Sidebar Navigasi */}
        <aside className="w-64 bg-blue-900 text-white flex flex-col z-10 shadow-lg">
          <div className="p-6 text-2xl font-bold border-b border-blue-800 flex items-center gap-2">
            <CloudRain className="w-8 h-8 text-blue-300" />
            <span>TAF App</span>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link
              href="/generator"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <CloudRain className="w-5 h-5" />
              TAF Generator
            </Link>
            <Link
              href="/validator"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <CheckSquare className="w-5 h-5" />
              TAF Validator
            </Link>
            <Link
              href="/archive"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800 transition-colors border-t border-blue-800/50 mt-4 pt-4"
            >
              <Archive className="w-5 h-5 text-blue-300" /> Arsip TAF
            </Link>
          </nav>
          <div className="p-4 text-xs text-blue-400 border-t border-blue-800 text-center">
            © 2026 Fatuh Hidayatullah
          </div>
        </aside>

        {/* Konten Utama */}
        <main className="flex-1 overflow-y-auto p-8 relative">{children}</main>

        {/* Asisten AI Chatbot Melayang Global */}
        <Chatbot />
      </body>
    </html>
  );
}
