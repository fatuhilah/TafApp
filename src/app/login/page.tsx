"use client";

import { useState } from "react";
import { loginAction } from "./actions";
import { Shield, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <div className="w-full max-w-[400px] p-8 md:p-10 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center text-center mx-4">
      {/* Icon Shield */}
      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-5 border border-white/10 shadow-inner">
        <Shield className="text-blue-300 w-7 h-7" />
      </div>

      {/* Judul */}
      <h1 className="text-2xl font-extrabold text-white mb-2 tracking-wide">
        TafApp BMKG
      </h1>
      <p className="text-xs text-slate-300 mb-8 font-medium">
        Masukkan Password untuk Akses Sistem
      </p>

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="password"
            name="password"
            required
            placeholder="Masukkan Sandi Operasional..."
            className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm shadow-inner"
          />
        </div>

        {/* Error State (Disesuaikan dengan Dark Mode) */}
        {error && (
          <div className="text-red-200 text-sm font-medium text-center bg-red-500/20 py-2 rounded-lg border border-red-500/30">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/25"
        >
          Masuk Sistem <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Footer Text */}
      <p className="text-[10px] text-slate-400/80 mt-10">
        &copy; 2026 Fatuh Hidayatullah.
      </p>
    </div>
  );
}
