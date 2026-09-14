"use client";
import { useState, useEffect } from "react";
import {
  Archive,
  Copy,
  FileEdit,
  Loader2,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ArchivePage() {
  const [tafs, setTafs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const router = useRouter();

  // STATE UNTUK NOTIFIKASI MODERN
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // STATE UNTUK MODAL HAPUS
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // STATE FILTER & PAGINATION
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Reset page ke 1 setiap kali filter atau limit berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDay, filterMonth, filterYear, itemsPerPage]);

  useEffect(() => {
    fetchTafs();
  }, []);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
  };

  const fetchTafs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/taf");
      const result = await res.json();
      if (result.success) {
        setTafs(result.data);
      } else {
        showToast(result.error || "Gagal memuat data", "error");
      }
    } catch (error) {
      console.error("Gagal memuat arsip", error);
      showToast("Kesalahan jaringan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: number, rawTaf: string) => {
    navigator.clipboard.writeText(rawTaf);
    setCopiedId(id);
    showToast("Sandi disalin ke clipboard!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // FUNGSI EKSEKUSI HAPUS MODERN
  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/taf?id=${deleteConfirmId}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setTafs(tafs.filter((t) => t.id !== deleteConfirmId));
        showToast("Sandi TAF berhasil dihapus.", "success");
      } else {
        // Akan memunculkan pesan error spesifik dari backend jika gagal
        showToast(result.error || "Gagal menghapus TAF dari server.", "error");
      }
    } catch (error) {
      console.error("Error menghapus TAF:", error);
      showToast("Kesalahan jaringan saat menghapus.", "error");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleEditToAmdCor = (rawTaf: string) => {
    sessionStorage.setItem("edit_taf_raw", rawTaf);
    router.push("/generator");
  };

  // --- LOGIKA FILTERING (Asumsi database punya field 'created_at') ---
  const filteredTafs = tafs.filter((taf) => {
    // Kalau nggak ada timestamp dari DB, fallback aman pakai waktu sekarang (atau sesuaikan)
    const dateObj = new Date(taf.created_at || Date.now());
    const day = dateObj.getDate().toString().padStart(2, "0");
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const year = dateObj.getFullYear().toString();

    if (filterDay && filterDay !== day) return false;
    if (filterMonth && filterMonth !== month) return false;
    if (filterYear && filterYear !== year) return false;
    return true;
  });

  // --- LOGIKA PAGINATION ---
  const totalPages = Math.max(1, Math.ceil(filteredTafs.length / itemsPerPage));
  const paginatedTafs = filteredTafs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // --- LOGIKA DOWNLOAD CSV ---
  const handleDownloadCSV = () => {
    if (filteredTafs.length === 0) {
      showToast("Tidak ada data untuk didownload", "warning");
      return;
    }

    const headers = [
      "ICAO",
      "Tanggal",
      "Bulan",
      "Tahun",
      "Validitas",
      "Jenis",
      "Sandi TAF",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredTafs.map((t) => {
        const d = new Date(t.created_at || Date.now());
        const day = d.getDate().toString().padStart(2, "0");
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const year = d.getFullYear().toString();
        // Bersihkan tanda kutip ganda dari TAF agar format CSV tidak rusak
        const cleanTaf = t.raw_taf.replace(/"/g, '""');
        return `\({t.icao_code},\){day},\({month},\){year},\({t.validity},\){t.type},"${cleanTaf}"`;
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Arsip_TAF_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    showToast("File CSV berhasil didownload!", "success");
  };

  return (
    <div className="flex flex-col h-full gap-6 relative">
      {/* TOAST NOTIFICATION MODERN */}
      <div
        className={`fixed bottom-8 right-8 z-50 transform transition-all duration-500 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${toast.show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"} ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : toast.type === "error" ? (
          <XCircle className="w-6 h-6" />
        ) : (
          <AlertTriangle className="w-6 h-6" />
        )}
        <div className="flex flex-col">
          <span className="font-bold text-sm">
            {toast.type === "success"
              ? "Berhasil"
              : toast.type === "error"
                ? "Gagal"
                : "Peringatan"}
          </span>
          <span className="text-sm">{toast.message}</span>
        </div>
      </div>

      {/* MODAL KONFIRMASI HAPUS MODERN */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                Hapus Arsip TAF?
              </h3>
            </div>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Sandi TAF akan dihapus secara
              permanen dari database sistem.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-2 font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-3">
          <Archive className="w-8 h-8 text-blue-600" />
          Arsip TAF
        </h1>

        <div className="flex items-center gap-2">
          {/* Tombol CSV */}
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
            title="Download CSV"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">CSV</span>
          </button>

          {/* Tombol Refresh */}
          <button
            onClick={fetchTafs}
            className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* BARIS FILTER */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Hari */}
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Hari</option>
            {Array.from({ length: 31 }, (_, i) => {
              const day = String(i + 1).padStart(2, "0");
              return (
                <option key={day} value={day}>
                  {day}
                </option>
              );
            })}
          </select>

          {/* Filter Bulan */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Bulan</option>
            {[
              ["01", "Januari"],
              ["02", "Februari"],
              ["03", "Maret"],
              ["04", "April"],
              ["05", "Mei"],
              ["06", "Juni"],
              ["07", "Juli"],
              ["08", "Agustus"],
              ["09", "September"],
              ["10", "Oktober"],
              ["11", "November"],
              ["12", "Desember"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Filter Tahun */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Tahun</option>
            {Array.from(
              new Set(
                tafs.map((taf) => {
                  const date = new Date(taf.created_at || Date.now());
                  return date.getFullYear().toString();
                }),
              ),
            )
              .sort((a, b) => Number(b) - Number(a))
              .map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
          </select>

          {/* Reset Filter */}
          {(filterDay || filterMonth || filterYear) && (
            <button
              onClick={() => {
                setFilterDay("");
                setFilterMonth("");
                setFilterYear("");
              }}
              className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Reset Filter
            </button>
          )}

          {/* Info hasil filter */}
          <div className="ml-auto text-sm text-slate-500">
            Menampilkan{" "}
            <span className="font-bold text-slate-700">
              {filteredTafs.length}
            </span>{" "}
            data
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p>Memuat riwayat TAF...</p>
          </div>
        ) : tafs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Archive className="w-12 h-12 mb-3 opacity-20" />
            <p>Belum ada TAF yang disimpan ke database.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-0">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 border-b border-slate-200 shadow-sm z-10">
                <tr>
                  <th className="p-4 font-semibold w-24">ICAO</th>
                  <th className="p-4 font-semibold w-32">Validitas</th>
                  <th className="p-4 font-semibold w-24">Jenis</th>
                  <th className="p-4 font-semibold">Sandi TAF</th>
                  <th className="p-4 font-semibold text-center w-40">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTafs.map((taf) => (
                  <tr
                    key={taf.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-bold text-slate-700">
                      {taf.icao_code}
                    </td>
                    <td className="p-4 text-blue-700 font-bold font-mono">
                      {taf.validity}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          taf.type === "NORMAL"
                            ? "bg-blue-100 text-blue-700"
                            : taf.type === "AMD"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {taf.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-w-xl">
                      {taf.raw_taf}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleCopy(taf.id, taf.raw_taf)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Salin TAF"
                        >
                          {copiedId === taf.id ? (
                            <span className="text-emerald-500 font-bold text-[10px]">
                              Tersalin
                            </span>
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleEditToAmdCor(taf.raw_taf)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Buat AMD/COR dari sandi ini"
                        >
                          <FileEdit className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(taf.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus TAF"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 border-t border-slate-200 bg-slate-50">
              {/* INFO DATA */}
              <div className="text-sm text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold text-slate-700">
                  {filteredTafs.length === 0
                    ? 0
                    : (currentPage - 1) * itemsPerPage + 1}
                </span>
                {" - "}
                <span className="font-semibold text-slate-700">
                  {Math.min(currentPage * itemsPerPage, filteredTafs.length)}
                </span>
                {" dari "}
                <span className="font-semibold text-slate-700">
                  {filteredTafs.length}
                </span>{" "}
                data
              </div>

              <div className="flex items-center gap-2">
                {/* DATA PER HALAMAN */}
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-sm text-slate-500">Tampil:</span>

                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* PREVIOUS */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Halaman sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* NOMOR HALAMAN */}
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-9 h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* NEXT */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={totalPages === 0 || currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Halaman berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
