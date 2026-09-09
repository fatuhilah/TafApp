"use client";

import { useState } from "react";
import { loginAction } from "./actions";
import { Lock, CloudLightning, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full w-11/12">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <CloudLightning className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">TafApp BMKG</h1>
          <p className="text-slate-500 text-center mt-2 text-sm">
            Masukkan Password untuk mengakses sistem.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="password"
              name="password"
              required
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="Masukkan Sandi Operasional..."
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            Masuk Sistem <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
