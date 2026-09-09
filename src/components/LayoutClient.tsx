"use client";

import { useState } from "react";
import Link from "next/link";
import { CloudRain, CheckSquare, Archive, Menu, X } from "lucide-react";
import Chatbot from "@/components/Chatbot";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* HEADER MOBILE (Hanya tampil di HP / < lg) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-blue-900 text-white flex items-center justify-between px-4 z-30 shadow-md">
        <div className="flex items-center gap-2 font-bold text-lg">
          <CloudRain className="w-6 h-6 text-blue-300" />
          <span>TAF App</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-blue-800 hover:bg-blue-700 text-white focus:outline-none"
        >
          {isSidebarOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </header>

      {/* OVERLAY HITAM TRANSLUSEN UNTUK HP SAAT SIDEBAR BUKA */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* SIDEBAR RESPONSIVE */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 w-64 bg-blue-900 text-white flex flex-col z-50 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 text-2xl font-bold border-b border-blue-800 flex items-center gap-2">
          <CloudRain className="w-8 h-8 text-blue-300" />
          <span>TAF App</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/generator"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <CloudRain className="w-5 h-5" />
            TAF Generator
          </Link>
          <Link
            href="/validator"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <CheckSquare className="w-5 h-5" />
            TAF Validator
          </Link>
          <Link
            href="/archive"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800 transition-colors border-t border-blue-800/50 mt-4 pt-4"
          >
            <Archive className="w-5 h-5 text-blue-300" /> Arsip TAF
          </Link>
        </nav>
        <div className="p-4 text-xs text-blue-400 border-t border-blue-800 text-center">
          © 2026 Fatuh Hidayatullah
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 lg:pt-8 relative w-full">
        {children}
      </main>

      {/* CHATBOT */}
      <Chatbot />
    </div>
  );
}
