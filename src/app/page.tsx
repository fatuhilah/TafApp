export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-4xl font-bold text-blue-900 mb-4">
        Selamat Datang di TAF App
      </h1>
      <p className="text-slate-600 max-w-xl">
        Aplikasi ini memfasilitasi pembuatan (Generator) dan pengecekan
        (Validator) Aerodrome Forecast (TAF) sesuai dengan aturan SOP BMKG 2025.
      </p>
    </div>
  );
}
