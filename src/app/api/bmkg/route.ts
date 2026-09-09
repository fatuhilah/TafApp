import { NextResponse } from "next/server";

export async function GET() {
  const ADM4_WALS = "64.72.04.1001";

  try {
    const BMKG_ENDPOINT = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${ADM4_WALS}`;

    const response = await fetch(BMKG_ENDPOINT, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`BMKG API Error: ${response.status}`);
    }

    const rawData = await response.json();
    let formattedData: any[] = [];

    // PERBAIKAN: Gunakan .flat() untuk menggabungkan array Hari 1, 2, dan 3 menjadi satu timeline utuh
    let cuacaList: any[] = [];
    if (rawData?.data?.[0]?.cuaca) {
      cuacaList = rawData.data[0].cuaca.flat();
    } else if (rawData?.data?.cuaca) {
      cuacaList = rawData.data.cuaca.flat();
    }

    if (Array.isArray(cuacaList) && cuacaList.length > 0) {
      formattedData = cuacaList.map((item: any) => {
        const utcStr = item.utc_datetime.replace(" ", "T") + "Z";
        const dt = new Date(utcStr);

        const timestamp = dt.getTime();
        const dateDD = dt.getUTCDate().toString().padStart(2, "0");
        const hour = dt.getUTCHours().toString().padStart(2, "0") + "Z";

        const windDir = item.wd_deg || item.wd || "VRB";
        const windSpeedKmh = parseFloat(item.ws) || 0;
        const windSpeedKt = Math.round(windSpeedKmh * 0.539957);

        const visKm = parseFloat(item.vs_text || item.vs) || 10;
        let visM = "9999";
        if (visKm < 10) {
          visM = (Math.floor((visKm * 1000) / 100) * 100)
            .toString()
            .padStart(4, "0");
        }

        const wxDesc =
          item.weather_desc_en || item.weather_desc || "Partly Cloudy";
        const tcc = parseInt(item.tcc) || 0;
        let cloudCat = "NSC";
        if (tcc > 87) cloudCat = "OVC";
        else if (tcc > 50) cloudCat = "BKN";
        else if (tcc > 25) cloudCat = "SCT";
        else if (tcc > 0) cloudCat = "FEW";

        return {
          timestamp,
          dateDD,
          hour,
          wind: `${windDir} / ${windSpeedKt} KT`,
          visM,
          wxDesc,
          cloudCat,
        };
      });
    }

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error: any) {
    console.error("BMKG Fetch Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data BMKG." },
      { status: 500 },
    );
  }
}
