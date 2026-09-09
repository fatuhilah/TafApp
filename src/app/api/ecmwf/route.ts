import { NextResponse } from "next/server";
import { fetchWeatherApi } from "openmeteo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date"); // Format: YYYY-MM-DD

  if (!dateStr) {
    return NextResponse.json(
      { success: false, error: "Tanggal wajib diisi" },
      { status: 400 },
    );
  }

  // Tarik data untuk 2 hari agar validitas 24-jam yang melintasi tengah malam selalu tercover
  const startDate = new Date(dateStr);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endDateStr = endDate.toISOString().split("T")[0];

  try {
    const params = {
      latitude: -0.3745178, // FIXED KOORDINAT WALS
      longitude: 117.24637,
      start_date: dateStr,
      end_date: endDateStr,
      hourly: [
        "temperature_2m",
        "rain",
        "visibility",
        "surface_temperature",
        "weather_code",
        "cloud_cover_low",
        "wind_speed_10m",
        "wind_direction_10m",
        "cape",
        "wind_gusts_10m",
      ],
      models: "ecmwf_ifs",
      wind_speed_unit: "kn",
    };

    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);
    const response = responses[0];
    const hourly = response.hourly()!;
    const utcOffsetSeconds = response.utcOffsetSeconds();

    const times = Array.from(
      {
        length:
          (Number(hourly.timeEnd()) - Number(hourly.time())) /
          hourly.interval(),
      },
      (_, i) =>
        new Date(
          (Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) *
            1000,
        ),
    );

    // Ekstrak sesuai index params.hourly
    const rainArr = hourly.variables(1)!.valuesArray();
    const visArr = hourly.variables(2)!.valuesArray();
    const wxCodeArr = hourly.variables(4)!.valuesArray();
    const cloudLowArr = hourly.variables(5)!.valuesArray();
    const windSpdArr = hourly.variables(6)!.valuesArray();
    const windDirArr = hourly.variables(7)!.valuesArray();
    const capeArr = hourly.variables(8)!.valuesArray();
    const windGustArr = hourly.variables(9)!.valuesArray();

    let formattedData = [];

    for (let i = 0; i < times.length; i++) {
      const dt = times[i];
      const timestamp = dt.getTime(); // Kunci untuk filter range waktu di Front-End
      const dateDD = dt.getUTCDate().toString().padStart(2, "0");
      const hour = dt.getUTCHours().toString().padStart(2, "0") + "Z";

      // ANGIN
      let windDirStr = "VRB";
      if (!isNaN(windDirArr[i])) {
        let dirRounded = Math.round(windDirArr[i] / 10) * 10;
        if (dirRounded === 0) dirRounded = 360;
        windDirStr = dirRounded.toString().padStart(3, "0");
      }
      const spdNum = Math.round(windSpdArr[i]);
      const gustNum = Math.round(windGustArr[i]);
      const windSpdStr = spdNum.toString().padStart(2, "0");

      let windStr = `${windDirStr}${windSpdStr}`;
      if (gustNum - spdNum >= 10)
        windStr += `G${gustNum.toString().padStart(2, "0")}`;
      windStr += "KT";

      // VISIBILITAS
      const visRaw = visArr[i];
      let vis = "9999";
      if (visRaw < 10000) {
        if (visRaw < 800)
          vis = (Math.floor(visRaw / 50) * 50).toString().padStart(4, "0");
        else if (visRaw < 5000)
          vis = (Math.floor(visRaw / 100) * 100).toString().padStart(4, "0");
        else
          vis = (Math.floor(visRaw / 1000) * 1000).toString().padStart(4, "0");
      }

      // CUACA & CAPE
      const weatherCode = wxCodeArr[i];
      const cape = Math.round(capeArr[i]);
      const rain = rainArr[i];
      let wx = "";
      if (cape > 1000 && rain > 0) wx = "TSRA";
      else if (weatherCode === 45 || weatherCode === 48) wx = "FG";
      else if (weatherCode === 51 || weatherCode === 53 || weatherCode === 55)
        wx = "-DZ";
      else if (weatherCode === 61 || weatherCode === 80) wx = "-RA";
      else if (weatherCode === 63 || weatherCode === 81) wx = "RA";
      else if (weatherCode === 65 || weatherCode === 82) wx = "+RA";
      else if (weatherCode >= 95) wx = "TSRA";
      else if (visRaw < 1000) wx = "FG";
      else if (visRaw >= 1000 && visRaw < 5000) wx = "BR";

      // AWAN
      const cloudLow = cloudLowArr[i];
      let cloud = "NSC";
      if (cloudLow > 87) cloud = "OVC015";
      else if (cloudLow > 50) cloud = "BKN015";
      else if (cloudLow > 25) cloud = "SCT015";
      else if (cloudLow > 0) cloud = "FEW015";
      if (wx.includes("TS")) cloud = cloud.replace("015", "015CB");

      formattedData.push({
        timestamp,
        dateDD,
        hour,
        windDir: windDirStr,
        windSpd: windSpdStr,
        windStr,
        vis,
        wx,
        cloud,
        cape,
        rain: rain.toFixed(1),
      });
    }

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("ECMWF Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses data ECMWF." },
      { status: 500 },
    );
  }
}
