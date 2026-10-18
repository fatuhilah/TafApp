"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([
    {
      role: "ai",
      text: "Halo! Saya TafApp AI Assistant. Silakan bertanya seputar TAF?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State dan Ref untuk Dragging
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragInfo = useRef({ startX: 0, startY: 0, isDragging: false });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragInfo.current.startX = e.clientX - position.x;
    dragInfo.current.startY = e.clientY - position.y;
    dragInfo.current.isDragging = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 && e.pointerType === "mouse") return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      const newX = e.clientX - dragInfo.current.startX;
      const newY = e.clientY - dragInfo.current.startY;

      // Threshold 5px agar klik biasa tidak dianggap geser
      if (Math.abs(newX - position.x) > 5 || Math.abs(newY - position.y) > 5) {
        dragInfo.current.isDragging = true;
        setPosition({ x: newX, y: newY });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!dragInfo.current.isDragging) {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Maaf, koneksi ke Gemini terputus." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Pembungkus Draggable Tombol Melayang */}
      <div
        className={`fixed bottom-34 left-8 z-50 ${isOpen ? "hidden" : "flex"}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          touchAction: "none", // Mencegah layar scroll saat digeser di HP
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-transform active:scale-95 flex items-center justify-center cursor-grab active:cursor-grabbing">
          {/* pointer-events-none wajib agar deteksi pointer capture tidak bocor ke SVG */}
          <Sparkles className="w-7 h-7 pointer-events-none" />
        </button>
      </div>

      {/* Jendela Chat */}
      <div
        className={`fixed bottom-35 left-8 z-[50] w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 transform origin-bottom-left ${isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`}
        style={{ height: "500px" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-t-2xl flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <h3 className="font-bold">TafApp AI Assistant</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ruang Obrolan */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] p-3.5 rounded-2xl shadow-sm break-words overflow-hidden ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                }`}
              >
                <div
                  className={`prose prose-sm leading-relaxed max-w-none ${msg.role === "user" ? "prose-invert" : "prose-blue"}`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-500 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Mengetik...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Area Input */}
        <div className="p-3 border-t border-slate-200 bg-white rounded-b-2xl flex gap-2">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Ketik pesan di sini..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}
