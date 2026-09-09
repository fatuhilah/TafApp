"use client";
import { useState, useEffect } from "react";
import {
  Save,
  Plus,
  Trash2,
  CloudLightning,
  AlertTriangle,
  LineChart,
  MapPin,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Copy,
} from "lucide-react";

const VISIBILITY_OPTIONS = [
  "0000",
  "0050",
  "0100",
  "0150",
  "0200",
  "0250",
  "0300",
  "0350",
  "0400",
  "0500",
  "0600",
  "0700",
  "0800",
  "0900",
  "1000",
  "1200",
  "1500",
  "1800",
  "2000",
  "2500",
  "3000",
  "3500",
  "4000",
  "4500",
  "5000",
  "6000",
  "7000",
  "8000",
  "9000",
  "9999",
];

const WX_OPTIONS_MAIN = [
  { value: "", label: "(Tidak Ada / Cerah)" },
  { value: "BR", label: "BR (Mist / Halimun)" },
  { value: "FG", label: "FG (Fog / Kabut)" },
  { value: "HZ", label: "HZ (Haze / Udara Kabur)" },
  { value: "FU", label: "FU (Smoke / Asap)" },
  { value: "VA", label: "VA (Volcanic Ash)" },
  { value: "-DZ", label: "-DZ (Light Drizzle)" },
  { value: "DZ", label: "DZ (Moderate Drizzle)" },
  { value: "-RA", label: "-RA (Light Rain)" },
  { value: "RA", label: "RA (Moderate Rain)" },
  { value: "+RA", label: "+RA (Heavy Rain)" },
  { value: "-SHRA", label: "-SHRA (Light Shower)" },
  { value: "SHRA", label: "SHRA (Moderate Shower)" },
  { value: "+SHRA", label: "+SHRA (Heavy Shower)" },
  { value: "TS", label: "TS (Thunderstorm Tanpa Hujan)" },
  { value: "-TS", label: "-TS (Light Thunderstorm)" },
  { value: "+TS", label: "+TS (Heavy Thunderstorm)" },
  { value: "-TSRA", label: "-TSRA (Thunderstorm w/ Light Rain)" },
  { value: "TSRA", label: "TSRA (Thunderstorm w/ Rain)" },
  { value: "+TSRA", label: "+TSRA (Thunderstorm w/ Heavy Rain)" },
  { value: "FZFG", label: "FZFG (Freezing Fog)" },
  { value: "SQ", label: "SQ (Squall)" },
  { value: "FC", label: "FC (Funnel Cloud / Tornado)" },
];

const WX_OPTIONS_CG = [
  { value: "NSW", label: "NSW (Nil Significant Weather)" },
  ...WX_OPTIONS_MAIN.filter(
    (wx) => !["", "-DZ", "-RA", "-SHRA"].includes(wx.value),
  ),
];

export default function GeneratorPage() {
  const [header, setHeader] = useState({
    icao: "WALS",
    date: "",
    issueTime: "05",
    type: "NORMAL",
    sequence: "A",
    customHour: "",
    customMinute: "",
    customValidStart: "",
  });
  const [weather, setWeather] = useState({
    isCavok: false,
    windDir: "",
    windSpeed: "",
    windGust: "",
    visibility: "",
    wx: "",
  });
  const [clouds, setClouds] = useState([{ amount: "", height: "", type: "" }]);
  const [changeGroups, setChangeGroups] = useState<any[]>([]);
  const [tafPreview, setTafPreview] = useState<string>("");

  const [ecmwfData, setEcmwfData] = useState<any[]>([]);
  const [isEcmwfLoading, setIsEcmwfLoading] = useState(false);
  const [bmkgData, setBmkgData] = useState<any[]>([]);
  const [isBmkgLoading, setIsBmkgLoading] = useState(false);
  const [recommendedTaf, setRecommendedTaf] = useState<string>("");
  const [recommendedBmkgTaf, setRecommendedBmkgTaf] = useState<string>("");

  // PETA STATE
  const [streamlineOffset, setStreamlineOffset] = useState<number>(0);
  const [streamlineError, setStreamlineError] = useState<boolean>(false);

  const [kiOffset, setKiOffset] = useState<number>(0);
  const [kiError, setKiError] = useState<boolean>(false);

  const [liOffset, setLiOffset] = useState<number>(0);
  const [liError, setLiError] = useState<boolean>(false);

  const [siOffset, setSiOffset] = useState<number>(0);
  const [siError, setSiError] = useState<boolean>(false);

  const [rainType, setRainType] = useState<"HOURLY" | "DAILY">("HOURLY");
  const [rainOffset, setRainOffset] = useState<number>(0);
  const [rainError, setRainError] = useState<boolean>(false);

  const [rhLevel, setRhLevel] = useState<string>("850mb");
  const [rhOffset, setRhOffset] = useState<number>(0);
  const [rhError, setRhError] = useState<boolean>(false);

  const [olrDay, setOlrDay] = useState<string>("1");
  const [olrError, setOlrError] = useState<boolean>(false);
  const olrDaysArr = ["1", "2", "3", "5", "7", "10"];

  const [windLevel, setWindLevel] = useState<string>("10m");
  const [windOffset, setWindOffset] = useState<number>(0);
  const [windError, setWindError] = useState<boolean>(false);

  // STATE UNTUK LIGHTBOX (ZOOM GAMBAR)
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    type:
      | "STREAMLINE"
      | "KI"
      | "LI"
      | "SI"
      | "RAIN"
      | "RH"
      | "OLR"
      | "WIND"
      | null;
  }>({ isOpen: false, type: null });

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // ENGINE AUTO-FILL DARI ARSIP (REVERSE-PARSER)
  useEffect(() => {
    const savedRawTaf = sessionStorage.getItem("edit_taf_raw");
    if (savedRawTaf) {
      try {
        const lines = savedRawTaf
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length >= 2) {
          // Membedah TAF Utama (Baris ke-2)
          const mainTokens = lines[1].split(" ").filter(Boolean);

          let typeIndex = 1;
          let tafType = "NORMAL";
          if (mainTokens[1] === "AMD" || mainTokens[1] === "COR") {
            tafType = mainTokens[1];
            typeIndex = 2;
          }

          const parsedIcao = mainTokens[typeIndex];
          const timeZ = mainTokens[typeIndex + 1];

          // AMBIL TANGGAL, JAM, MENIT DARI SANDI
          const parsedDD = timeZ.substring(0, 2);
          const parsedIssueH = timeZ.substring(2, 4);
          const parsedIssueM = timeZ.substring(4, 6);

          // LOGIKA PINTAR UNTUK MENDAPATKAN BULAN & TAHUN (YYYY-MM-DD)
          const now = new Date();
          let yyyy = now.getUTCFullYear();
          let mm = now.getUTCMonth() + 1;

          // Cegah error perpindahan bulan: Jika hari ini tanggal 1, tapi TAF berisi tanggal 31, berarti TAF itu milik bulan lalu
          if (now.getUTCDate() < 10 && parseInt(parsedDD) > 20) {
            mm -= 1;
            if (mm === 0) {
              mm = 12;
              yyyy -= 1;
            }
          }

          const parsedDateStr = `${yyyy}-${String(mm).padStart(2, "0")}-${parsedDD}`;

          setHeader((prev) => ({
            ...prev,
            date: parsedDateStr,
            icao: parsedIcao,
            type: tafType,
            issueTime: parsedIssueH,
            customHour: parsedIssueH,
            customMinute: parsedIssueM,
            sequence: "A",
          }));

          let wDir = "",
            wSpd = "",
            wGst = "",
            vis = "",
            wWx = "";
          let isCavok = false;
          let clds: any[] = [];

          for (let i = typeIndex + 3; i < mainTokens.length; i++) {
            const t = mainTokens[i].replace("=", "");
            if (t.includes("KT")) {
              wDir = t.substring(0, 3);
              wSpd = t.substring(3, 5);
              if (t.includes("G")) wGst = t.split("G")[1].replace("KT", "");
            } else if (t === "CAVOK") {
              isCavok = true;
            } else if (/^\d{4}$/.test(t)) {
              vis = t;
            } else if (WX_OPTIONS_MAIN.some((w) => w.value === t)) {
              wWx = t;
            } else if (t === "NSW") {
              wWx = "NSW";
            } else if (t === "NSC") {
              clds.push({ amount: "NSC", height: "", type: "" });
            } else if (/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/.test(t)) {
              const m = t.match(/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/);
              if (m)
                clds.push({ amount: m[1], height: m[2], type: m[3] || "" });
            }
          }

          if (clds.length === 0)
            clds.push({ amount: "", height: "", type: "" });
          setWeather({
            isCavok,
            windDir: wDir,
            windSpeed: wSpd,
            windGust: wGst,
            visibility: vis,
            wx: wWx,
          });
          setClouds(clds);

          // Membedah Change Groups
          const cgs = [];
          for (let i = 2; i < lines.length; i++) {
            const cgTokens = lines[i].split(" ").filter(Boolean);
            let ind = cgTokens[0];
            let vIdx = 1;
            if (ind === "PROB30" || ind === "PROB40") {
              ind = ind + " " + cgTokens[1];
              vIdx = 2;
            }

            const validParts = cgTokens[vIdx].split("/");
            const sH = validParts[0].substring(2, 4);
            const eH = validParts[1].substring(2, 4);

            let cgWdir = "",
              cgWspd = "",
              cgWgst = "",
              cgVis = "",
              cgWx = "",
              cgAmt = "",
              cgHt = "",
              cgTyp = "";
            let hW = false,
              hV = false,
              hX = false,
              hC = false;

            for (let j = vIdx + 1; j < cgTokens.length; j++) {
              const t = cgTokens[j].replace("=", "");
              if (t.includes("KT")) {
                hW = true;
                cgWdir = t.substring(0, 3);
                cgWspd = t.substring(3, 5);
                if (t.includes("G")) cgWgst = t.split("G")[1].replace("KT", "");
              } else if (/^\d{4}$/.test(t)) {
                hV = true;
                cgVis = t;
              } else if (WX_OPTIONS_CG.some((w) => w.value === t)) {
                hX = true;
                cgWx = t;
              } else if (t === "NSC") {
                hC = true;
                cgAmt = "NSC";
              } else if (/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/.test(t)) {
                hC = true;
                const m = t.match(/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/);
                if (m) {
                  cgAmt = m[1];
                  cgHt = m[2];
                  cgTyp = m[3] || "";
                }
              }
            }
            cgs.push({
              indicator: ind,
              start: sH,
              end: eH,
              hasWind: hW,
              windDir: cgWdir,
              windSpeed: cgWspd,
              windGust: cgWgst,
              hasVis: hV,
              visibility: cgVis,
              hasWx: hX,
              wx: cgWx,
              hasCloud: hC,
              cloudAmount: cgAmt,
              cloudHeight: cgHt,
              cloudType: cgTyp,
            });
          }
          setChangeGroups(cgs);
          showToast("Data TAF dimuat untuk diedit", "success");
        }
      } catch (err) {
        showToast("Gagal memuat sandi TAF mentah", "error");
      }
      sessionStorage.removeItem("edit_taf_raw"); // Bersihkan memori agar tidak bentrok
    }
  }, []);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
  };

  const getStreamlineInfo = (headerData: any, offsetDays: number) => {
    if (!headerData.date) return { url: "", displayDate: "" };
    const [yr, mo, da] = headerData.date.split("-").map(Number);
    const issueH = parseInt(headerData.issueTime) || 0;
    const refIssueTime = new Date(Date.UTC(yr, mo - 1, da, issueH, 0, 0));
    let finalStartObj = new Date(refIssueTime.getTime() + 60 * 60 * 1000);

    if (headerData.type !== "NORMAL" && headerData.customValidStart) {
      const customStartH = parseInt(headerData.customValidStart);
      finalStartObj = new Date(refIssueTime);
      finalStartObj.setUTCHours(customStartH);
      if (customStartH < issueH)
        finalStartObj.setUTCDate(finalStartObj.getUTCDate() + 1);
    }

    finalStartObj.setUTCDate(finalStartObj.getUTCDate() + offsetDays);
    const yyyy = finalStartObj.getUTCFullYear();
    const mm = String(finalStartObj.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(finalStartObj.getUTCDate()).padStart(2, "0");
    const cleanDate = `${yyyy}${mm}${dd}`;
    const jamRilis = "070000";

    return {
      url: `https://web-meteo.bmkg.go.id//media/data/bmkg/Angin3000ft/Streamline_${cleanDate}${jamRilis}.jpg`,
      displayDate: `${yyyy}-${mm}-${dd}`,
    };
  };

  const getEcmwfMapInfo = (
    headerData: any,
    offsetHours: number,
    type: string,
    level: string = "",
  ) => {
    if (!headerData.date) return { url: "", displayDate: "" };
    const [yr, mo, da] = headerData.date.split("-").map(Number);
    const issueH = parseInt(headerData.issueTime) || 0;
    const refIssueTime = new Date(Date.UTC(yr, mo - 1, da, issueH, 0, 0));
    let finalStartObj = new Date(refIssueTime.getTime() + 60 * 60 * 1000);

    if (headerData.type !== "NORMAL" && headerData.customValidStart) {
      const customStartH = parseInt(headerData.customValidStart);
      finalStartObj = new Date(refIssueTime);
      finalStartObj.setUTCHours(customStartH);
      if (customStartH < issueH)
        finalStartObj.setUTCDate(finalStartObj.getUTCDate() + 1);
    }

    finalStartObj.setUTCHours(finalStartObj.getUTCHours() + offsetHours);
    let hhNum = finalStartObj.getUTCHours();
    if (type === "KI" || type === "RH" || type === "WIND")
      hhNum = Math.floor(hhNum / 3) * 3;
    if (type === "LI" || type === "SI") hhNum = Math.floor(hhNum / 6) * 6;
    if (type === "RAIN_DAILY") hhNum = 0;
    finalStartObj.setUTCHours(hhNum);

    const yyyy = finalStartObj.getUTCFullYear();
    const mm = String(finalStartObj.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(finalStartObj.getUTCDate()).padStart(2, "0");
    const hhStr = String(finalStartObj.getUTCHours()).padStart(2, "0");
    const timeStr = `${yyyy}${mm}${dd}${hhStr}0000`;

    let url = "";
    let displayDate = `${dd}/${mm}/${yyyy} ${hhStr}Z`;

    if (type === "KI")
      url = `https://web-meteo.bmkg.go.id//media/data/bmkg/mfy/ecmwf/prakiraan/Backup/KI/ki_ifs0p125_sfc_${timeStr}.png`;
    else if (type === "LI")
      url = `https://web-meteo.bmkg.go.id//media/data/bmkg/mfy/ecmwf/prakiraan/Backup/LI/li_ifs0p125_sfc_${timeStr}.png`;
    else if (type === "SI")
      url = `https://web-meteo.bmkg.go.id//media/data/bmkg/mfy/ecmwf/prakiraan/Backup/SI/si_ifs0p125_sfc_${timeStr}.png`;
    else if (type === "RAIN_HOURLY")
      url = `https://web-meteo.bmkg.go.id//media/data/bmkg/mfy/ecmwf/prakiraan/Backup/RAIN//rainrate_ifs0p125_sfc_${timeStr}.png`;
    else if (type === "RAIN_DAILY") {
      url = `https://web-meteo.bmkg.go.id//media/data/bmkg/mfy/ecmwf/prakiraan/hjn24/Indonesia/24hr_rr_Indo_ifs12km_${yyyy}${mm}${dd}_00UTC.png`;
      displayDate = `${dd}/${mm}/${yyyy} (24h)`;
    } else if (type === "RH")
      url = `https://web-meteo.bmkg.go.id//media/data/bmkg/mfy/ecmwf/prakiraan/Backup/RH/rh_ifs0p125_${level}_${timeStr}.png`;
    else if (type === "WIND")
      url = `https://web-meteo.bmkg.go.id//media/data/bmkg/mfy/ecmwf/prakiraan/Backup/WIND/barb_ifs0p125_${level}_${timeStr}.png`;

    return { url, displayDate };
  };

  const getOlrMapInfo = (day: string) => {
    return {
      url: `https://ncics.org/pub/mjo/v2/map/olr.cfs.all.indonesia.${day}.png`,
      displayDate: `Day ${day}`,
    };
  };

  const streamlineInfo = getStreamlineInfo(header, streamlineOffset);
  const kiInfo = getEcmwfMapInfo(header, kiOffset, "KI");
  const liInfo = getEcmwfMapInfo(header, liOffset, "LI");
  const siInfo = getEcmwfMapInfo(header, siOffset, "SI");
  const rainInfo = getEcmwfMapInfo(
    header,
    rainOffset,
    rainType === "HOURLY" ? "RAIN_HOURLY" : "RAIN_DAILY",
  );
  const rhInfo = getEcmwfMapInfo(header, rhOffset, "RH", rhLevel);
  const windInfo = getEcmwfMapInfo(header, windOffset, "WIND", windLevel);
  const olrInfo = getOlrMapInfo(olrDay);

  let modalTitle = "";
  let modalInfo: any = {};
  let modalError = false;
  let modalPrev = () => {};
  let modalNext = () => {};

  if (lightbox.type === "STREAMLINE") {
    modalTitle = "Streamline 3000ft";
    modalInfo = streamlineInfo;
    modalError = streamlineError;
    modalPrev = () => {
      setStreamlineOffset((p) => p - 1);
      setStreamlineError(false);
    };
    modalNext = () => {
      setStreamlineOffset((p) => p + 1);
      setStreamlineError(false);
    };
  } else if (lightbox.type === "KI") {
    modalTitle = "K-Index (Potensi TS)";
    modalInfo = kiInfo;
    modalError = kiError;
    modalPrev = () => {
      setKiOffset((p) => p - 3);
      setKiError(false);
    };
    modalNext = () => {
      setKiOffset((p) => p + 3);
      setKiError(false);
    };
  } else if (lightbox.type === "LI") {
    modalTitle = "Lifted Index";
    modalInfo = liInfo;
    modalError = liError;
    modalPrev = () => {
      setLiOffset((p) => p - 6);
      setLiError(false);
    };
    modalNext = () => {
      setLiOffset((p) => p + 6);
      setLiError(false);
    };
  } else if (lightbox.type === "SI") {
    modalTitle = "Showalter Index";
    modalInfo = siInfo;
    modalError = siError;
    modalPrev = () => {
      setSiOffset((p) => p - 6);
      setSiError(false);
    };
    modalNext = () => {
      setSiOffset((p) => p + 6);
      setSiError(false);
    };
  } else if (lightbox.type === "RAIN") {
    modalTitle =
      rainType === "HOURLY" ? "Hourly Precipitation" : "Daily Precipitation";
    modalInfo = rainInfo;
    modalError = rainError;
    modalPrev = () => {
      setRainOffset((p) => p - (rainType === "HOURLY" ? 1 : 24));
      setRainError(false);
    };
    modalNext = () => {
      setRainOffset((p) => p + (rainType === "HOURLY" ? 1 : 24));
      setRainError(false);
    };
  } else if (lightbox.type === "RH") {
    modalTitle = `Relative Humidity (${rhLevel})`;
    modalInfo = rhInfo;
    modalError = rhError;
    modalPrev = () => {
      setRhOffset((p) => p - 3);
      setRhError(false);
    };
    modalNext = () => {
      setRhOffset((p) => p + 3);
      setRhError(false);
    };
  } else if (lightbox.type === "WIND") {
    modalTitle = `Wind Chart (${windLevel})`;
    modalInfo = windInfo;
    modalError = windError;
    modalPrev = () => {
      setWindOffset((p) => p - 3);
      setWindError(false);
    };
    modalNext = () => {
      setWindOffset((p) => p + 3);
      setWindError(false);
    };
  } else if (lightbox.type === "OLR") {
    modalTitle = "OLR with CFS Forecasts";
    modalInfo = olrInfo;
    modalError = olrError;
    modalPrev = () => {
      const idx = olrDaysArr.indexOf(olrDay);
      if (idx > 0) {
        setOlrDay(olrDaysArr[idx - 1]);
        setOlrError(false);
      }
    };
    modalNext = () => {
      const idx = olrDaysArr.indexOf(olrDay);
      if (idx < olrDaysArr.length - 1) {
        setOlrDay(olrDaysArr[idx + 1]);
        setOlrError(false);
      }
    };
  }

  const generateRecommendation = (filteredData: any[]) => {
    if (filteredData.length === 0) return;
    const base = filteredData[0];
    let recTaf = [base.windStr, base.vis, base.wx, base.cloud]
      .filter(Boolean)
      .join(" ");
    let activeGroup: any = null;
    const changeGroupsLocal = [];

    for (let i = 1; i < filteredData.length; i++) {
      const d = filteredData[i];
      const isBad =
        parseInt(d.vis) < 5000 ||
        parseFloat(d.rain) > 0.5 ||
        d.wx.includes("TS") ||
        d.wx.includes("FG");

      if (isBad) {
        if (!activeGroup) {
          activeGroup = {
            startDD: d.dateDD,
            startH: d.hour.replace("Z", ""),
            worstVis: parseInt(d.vis),
            worstWx: d.wx,
            hasTS: d.wx.includes("TS"),
            duration: 1,
          };
        } else {
          activeGroup.duration++;
          activeGroup.worstVis = Math.min(
            activeGroup.worstVis,
            parseInt(d.vis),
          );
          if (d.wx.includes("TS")) {
            activeGroup.hasTS = true;
            activeGroup.worstWx = "TSRA";
          } else if (d.wx === "+RA" && activeGroup.worstWx !== "TSRA") {
            activeGroup.worstWx = "+RA";
          } else if (d.wx !== "" && !activeGroup.worstWx) {
            activeGroup.worstWx = d.wx;
          }
        }
        if (activeGroup.duration === 4 || i === filteredData.length - 1) {
          changeGroupsLocal.push({ ...activeGroup });
          activeGroup = null;
        }
      } else {
        if (activeGroup) {
          changeGroupsLocal.push({ ...activeGroup });
          activeGroup = null;
        }
      }
    }

    changeGroupsLocal.forEach((cg) => {
      let endHNum = (parseInt(cg.startH) + cg.duration) % 24;
      let endDD =
        endHNum <= parseInt(cg.startH)
          ? (parseInt(cg.startDD) + 1).toString().padStart(2, "0")
          : cg.startDD;
      let tempoVis = cg.worstVis.toString().padStart(4, "0");
      let tempoWx = cg.worstWx || "RA";
      let tempoCloud = cg.hasTS ? "BKN010CB" : "BKN015";
      const tempoCond = [tempoVis, tempoWx, tempoCloud]
        .filter(Boolean)
        .join(" ");
      recTaf += `\nTEMPO ${cg.startDD}${cg.startH.padStart(2, "0")}/${endDD}${endHNum.toString().padStart(2, "0")} ${tempoCond}`;
    });
    setRecommendedTaf(recTaf);
  };

  const generateBmkgRecommendation = (filteredData: any[]) => {
    if (filteredData.length === 0) return;
    const base = filteredData[0];
    let windStr = "VRB00KT";
    if (base.wind) {
      const windParts = base.wind.split(" / ");
      if (windParts.length === 2) {
        let dirRaw = windParts[0].trim();
        let dirStr = "VRB";
        const spdNum = parseInt(windParts[1]) || 0;
        if (!isNaN(parseInt(dirRaw))) {
          let dirRounded = Math.round(parseInt(dirRaw) / 10) * 10;
          if (dirRounded === 0 && spdNum > 0) dirRounded = 360;
          dirStr = dirRounded.toString().padStart(3, "0");
        }
        if (spdNum === 0) dirStr = "000";
        const spdStr = spdNum.toString().padStart(2, "0");
        windStr = `${dirStr}${spdStr}KT`;
      }
    }

    const wxText = base.wxDesc.toLowerCase();
    let wxCode = "";
    if (wxText.includes("thunderstorm") || wxText.includes("petir"))
      wxCode = "TSRA";
    else if (wxText.includes("heavy rain") || wxText.includes("hujan lebat"))
      wxCode = "+RA";
    else if (wxText.includes("light rain") || wxText.includes("hujan ringan"))
      wxCode = "-RA";
    else if (wxText.includes("rain") || wxText.includes("hujan")) wxCode = "RA";
    else if (wxText.includes("fog") || wxText.includes("kabut")) wxCode = "FG";
    else if (wxText.includes("haze") || wxText.includes("asap")) wxCode = "HZ";

    let cloudStr = base.cloudCat !== "NSC" ? `${base.cloudCat}015` : "NSC";
    if (wxCode.includes("TS")) cloudStr = cloudStr.replace("015", "015CB");

    let recTaf = [windStr, base.visM, wxCode, cloudStr]
      .filter(Boolean)
      .join(" ");
    let activeGroup: any = null;
    const changeGroupsLocal = [];

    for (let i = 1; i < filteredData.length; i++) {
      const d = filteredData[i];
      const text = d.wxDesc.toLowerCase();
      const isBad =
        parseInt(d.visM) < 5000 ||
        text.includes("rain") ||
        text.includes("hujan") ||
        text.includes("thunderstorm") ||
        text.includes("petir") ||
        text.includes("fog") ||
        text.includes("kabut");

      if (isBad) {
        if (!activeGroup) {
          activeGroup = {
            startDD: d.dateDD,
            startH: d.hour.replace("Z", ""),
            worstVis: parseInt(d.visM),
            worstWxText: text,
            hasTS: text.includes("thunderstorm") || text.includes("petir"),
            duration: 3,
          };
        } else {
          activeGroup.duration += 3;
          activeGroup.worstVis = Math.min(
            activeGroup.worstVis,
            parseInt(d.visM),
          );
          if (text.includes("thunderstorm") || text.includes("petir")) {
            activeGroup.hasTS = true;
            activeGroup.worstWxText = "thunderstorm";
          } else if (text.includes("heavy") || text.includes("lebat")) {
            if (!activeGroup.hasTS) activeGroup.worstWxText = "heavy rain";
          }
        }
        if (activeGroup.duration >= 4 || i === filteredData.length - 1) {
          changeGroupsLocal.push({ ...activeGroup });
          activeGroup = null;
        }
      } else {
        if (activeGroup) {
          changeGroupsLocal.push({ ...activeGroup });
          activeGroup = null;
        }
      }
    }

    changeGroupsLocal.forEach((cg) => {
      const finalDuration = Math.min(cg.duration, 4);
      let endHNum = (parseInt(cg.startH) + finalDuration) % 24;
      let endDD =
        endHNum <= parseInt(cg.startH)
          ? (parseInt(cg.startDD) + 1).toString().padStart(2, "0")
          : cg.startDD;
      let tempoVis = cg.worstVis.toString().padStart(4, "0");
      let tempoWx = "RA";
      if (
        cg.worstWxText.includes("thunderstorm") ||
        cg.worstWxText.includes("petir")
      )
        tempoWx = "TSRA";
      else if (
        cg.worstWxText.includes("heavy") ||
        cg.worstWxText.includes("lebat")
      )
        tempoWx = "+RA";
      else if (
        cg.worstWxText.includes("light") ||
        cg.worstWxText.includes("ringan")
      )
        tempoWx = "-RA";
      else if (
        cg.worstWxText.includes("fog") ||
        cg.worstWxText.includes("kabut")
      )
        tempoWx = "FG";

      let tempoCloud = cg.hasTS ? "BKN015CB" : "BKN015";
      const tempoCond = [tempoVis, tempoWx, tempoCloud]
        .filter(Boolean)
        .join(" ");
      recTaf += `\nTEMPO ${cg.startDD}${cg.startH.padStart(2, "0")}/${endDD}${endHNum.toString().padStart(2, "0")} ${tempoCond}`;
    });
    setRecommendedBmkgTaf(recTaf);
  };

  const fetchEcmwfData = async () => {
    if (!header.date) return showToast("Pilih tanggal!", "warning");
    setIsEcmwfLoading(true);
    try {
      const res = await fetch(`/api/ecmwf?date=${header.date}`);
      const result = await res.json();
      if (result.success) {
        const baseDate = new Date(header.date);
        baseDate.setUTCHours(0, 0, 0, 0);
        const issueHourOriginal = parseInt(header.issueTime);
        const refIssueTime = new Date(baseDate);
        refIssueTime.setUTCHours(issueHourOriginal);

        let finalStartObj = new Date(refIssueTime.getTime() + 60 * 60 * 1000);
        const finalEndObj = new Date(
          finalStartObj.getTime() + 24 * 60 * 60 * 1000,
        );

        if (header.type !== "NORMAL" && header.customValidStart) {
          const customStartH = parseInt(header.customValidStart);
          finalStartObj = new Date(refIssueTime);
          finalStartObj.setUTCHours(customStartH);
          if (customStartH < issueHourOriginal) {
            finalStartObj.setUTCDate(finalStartObj.getUTCDate() + 1);
          }
        }
        const startMs = finalStartObj.getTime();
        const endMs = finalEndObj.getTime();
        const filteredData = result.data.filter(
          (d: any) => d.timestamp >= startMs && d.timestamp <= endMs,
        );
        setEcmwfData(filteredData);
        generateRecommendation(filteredData);
        showToast("Data NWP difilter sesuai waktu validitas.", "success");
      } else {
        showToast(result.error || "Gagal", "error");
      }
    } catch {
      showToast("Kesalahan jaringan.", "error");
    } finally {
      setIsEcmwfLoading(false);
    }
  };

  const fetchBmkgData = async () => {
    if (!header.date) return showToast("Pilih tanggal!", "warning");
    setIsBmkgLoading(true);
    try {
      const res = await fetch("/api/bmkg");
      const result = await res.json();
      if (result.success && result.data.length > 0) {
        const baseDate = new Date(header.date);
        baseDate.setUTCHours(0, 0, 0, 0);
        const issueHourOriginal = parseInt(header.issueTime);
        const refIssueTime = new Date(baseDate);
        refIssueTime.setUTCHours(issueHourOriginal);

        let finalStartObj = new Date(refIssueTime.getTime() + 60 * 60 * 1000);
        const finalEndObj = new Date(
          finalStartObj.getTime() + 24 * 60 * 60 * 1000,
        );

        if (header.type !== "NORMAL" && header.customValidStart) {
          const customStartH = parseInt(header.customValidStart);
          finalStartObj = new Date(refIssueTime);
          finalStartObj.setUTCHours(customStartH);
          if (customStartH < issueHourOriginal) {
            finalStartObj.setUTCDate(finalStartObj.getUTCDate() + 1);
          }
        }
        const startMs = finalStartObj.getTime();
        const endMs = finalEndObj.getTime();
        const filteredData = result.data.filter(
          (d: any) => d.timestamp >= startMs && d.timestamp <= endMs,
        );
        setBmkgData(filteredData);
        generateBmkgRecommendation(filteredData);
        showToast("Panduan BMKG difilter sesuai waktu validitas.", "success");
      } else {
        showToast(result.error || "Data BMKG kosong.", "error");
      }
    } catch {
      showToast("Kesalahan jaringan.", "error");
    } finally {
      setIsBmkgLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!header.date || !header.icao || !tafPreview)
      return showToast("Data belum lengkap!", "warning");
    if (!weather.windDir || !weather.windSpeed)
      return showToast("SOP Error: Angin utama wajib diisi!", "error");
    if (!weather.isCavok) {
      if (!weather.visibility)
        return showToast("SOP Error: Visibilitas utama wajib diisi!", "error");
      if (!clouds[0].amount)
        return showToast("SOP Error: Awan utama wajib diisi!", "error");
    }

    const issueTimeMatch = tafPreview.match(/[A-Z]{4}\s+(\d{6})[A-Z]?\s/);
    const validityMatch = tafPreview.match(/Z\s+(\d{4}\/\d{4})/);
    if (!issueTimeMatch || !validityMatch)
      return showToast("Sandi tidak valid.", "error");
    try {
      const response = await fetch("/api/taf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icao_code: header.icao,
          issue_time: issueTimeMatch[1],
          validity: validityMatch[1],
          type: header.type,
          raw_taf: tafPreview,
        }),
      });
      const result = await response.json();
      if (result.success) showToast("Sandi Disimpan!", "success");
      else showToast("Gagal menyimpan.", "error");
    } catch {
      showToast("Error jaringan.", "error");
    }
  };

  const addCloud = () => {
    if (clouds.length < 4)
      setClouds([...clouds, { amount: "", height: "", type: "" }]);
  };
  const removeCloud = (index: number) =>
    setClouds(clouds.filter((_, i) => i !== index));
  const updateCloud = (index: number, field: string, value: string) => {
    const newC = [...clouds];
    newC[index] = { ...newC[index], [field]: value };
    setClouds(newC);
  };

  const addChangeGroup = () => {
    if (changeGroups.length < 5)
      setChangeGroups([
        ...changeGroups,
        {
          indicator: "TEMPO",
          start: "",
          end: "",
          hasWind: false,
          windDir: "",
          windSpeed: "",
          windGust: "",
          hasVis: false,
          visibility: "",
          hasWx: false,
          wx: "",
          hasCloud: false,
          cloudAmount: "",
          cloudHeight: "",
          cloudType: "",
        },
      ]);
  };
  const removeChangeGroup = (index: number) =>
    setChangeGroups(changeGroups.filter((_, i) => i !== index));
  const updateChangeGroup = (index: number, field: string, value: any) => {
    const newG = [...changeGroups];
    newG[index] = { ...newG[index], [field]: value };
    setChangeGroups(newG);
  };

  const padWind = (val: string) => (val ? val.padStart(2, "0") : "");
  const padCloud = (val: string) => (val ? val.padStart(3, "0") : "");
  const formatWindDir = (val: string) => {
    let c = val.toUpperCase().trim();
    if (c === "VRB" || c === "") return c;
    let n = parseInt(c);
    if (!isNaN(n)) {
      n = Math.round(n / 10) * 10;
      if (n > 360) n = 360;
      if (n < 0) n = 0;
      return n.toString().padStart(3, "0");
    }
    return "";
  };

  const validateWxVis = (wx: string, vis: string) => {
    if (!vis) return "";
    const v = parseInt(vis);
    if (v < 5000 && (!wx || wx === "NSW"))
      return "SOP Error: Visibilitas < 5000m WAJIB ada cuaca signifikan!";
    if (!wx) return "";
    if (wx.includes("FG") && v >= 1000)
      return "SOP Error: FG visibilitas < 1000m";
    if (wx.includes("BR") && (v < 1000 || v > 5000))
      return "SOP Error: BR visibilitas 1000m - 5000m";
    if (["FU", "HZ", "DU", "SA"].some((w) => wx.includes(w)) && v > 5000)
      return "SOP Error: FU/HZ/DU/SA hanya disandikan jika visibilitas <= 5000m";
    return "";
  };

  const getBaseWarnings = (
    vis: string,
    wx: string,
    baseClouds: any[],
    cgList: any[],
  ) => {
    const warnings = [];
    const hasBecmg = cgList.some((cg) => cg.indicator === "BECMG");

    if (wx && wx !== "NSW" && !hasBecmg) {
      warnings.push(
        `Meteorological Warning: Cuaca dasar disandikan '${wx}'. Yakin fenomena ini akan terjadi nonstop 24 jam mendominasi seluruh periode TAF? (Tambahkan BECMG untuk menghentikannya, atau gunakan TEMPO jika fluktuatif).`,
      );
    }
    if (wx.includes("TS")) {
      const hasCb = baseClouds.some((c) => c.type === "CB");
      if (!hasCb) {
        warnings.push(
          `Meteorological Warning: Terdapat sandi petir (${wx}) tapi tidak ada awan CB di Base Condition.`,
        );
      }
    }

    // ATURAN BARU: VISIBILITAS < 1000m TANPA FG
    const visNum = parseInt(vis);
    if (visNum < 1000 && !wx.includes("FG")) {
      warnings.push(
        `Meteorological Warning: Visibilitas sangat rendah (${visNum}m). Umumnya jarak pandang di bawah 1000m disebabkan oleh kabut tebal (FG) atau hujan lebat. Yakin cuaca yang disandikan bukan FG?`,
      );
    }

    return warnings;
  };

  const getCgWarnings = (cg: any, eff: any) => {
    const warnings = [];

    if (cg.indicator === "BECMG" && cg.hasWx && cg.wx && cg.wx !== "NSW") {
      warnings.push(
        `Meteorological Warning: Yakin nih kondisi cuaca '${cg.wx}' akan berlangsung terus-menerus selama sisa durasi validitas TAF? (Cuaca fluktuatif seharusnya disandikan dengan TEMPO).`,
      );
    }

    const checkWx =
      cg.hasWx && cg.wx !== "" ? (cg.wx === "NSW" ? "" : cg.wx) : eff.effWx;
    const checkVis =
      cg.hasVis && cg.visibility !== ""
        ? parseInt(cg.visibility)
        : parseInt(eff.effVis) || 9999;

    if (checkWx.includes("TS")) {
      let hasCb = false;
      if (cg.hasCloud && cg.cloudAmount !== "NSC") {
        hasCb = cg.cloudType === "CB";
      } else if (!cg.hasCloud) {
        hasCb = eff.effClouds.some((c: any) => c.type === "CB");
      }
      if (!hasCb) {
        warnings.push(
          `Meteorological Warning: Terdapat sandi petir (${checkWx}) tapi tidak ada awan CB yang aktif. Pastikan menambahkan/mengubah tipe awan menjadi CB.`,
        );
      }
    }

    // ATURAN BARU: VISIBILITAS < 1000m TANPA FG DI CHANGE GROUP
    if (checkVis < 1000 && !checkWx.includes("FG")) {
      warnings.push(
        `Meteorological Warning (${cg.indicator}): Visibilitas anjlok hingga ${checkVis}m. Umumnya disebabkan oleh kabut radiasi/embun (FG). Yakin fenomena saat ini masih '${checkWx || "tidak ada"}'? Jika ini embun, pastikan ganti cuaca menjadi FG. Kalau ini hujan lebat, pastikan ganti cuaca menjadi RA/+RA/TSRA/+TSRA dan ada awan CB. Tapi kalau masih yakin seperti kondisi sebelumnya, ya lanjut aja.`,
      );
    }

    return warnings;
  };

  const validateCgVisibilityStrict = (mVis: string, cVis: string) => {
    if (!cVis || !mVis) return "";
    const v1 = parseInt(mVis);
    const v2 = parseInt(cVis);
    if (v1 === v2) return "SOP Error: Visibilitas tidak ada perubahan.";
    const t = [150, 350, 600, 800, 1500, 3000, 5000];
    let valid =
      v1 < v2
        ? t.some((x) => v1 < x && x <= v2)
        : t.some((x) => v1 > x && x >= v2);
    if (!valid)
      return `SOP Error: Perubahan ke ${v2}m tidak valid (batas threshold BMKG).`;
    return "";
  };

  const validateDuration = (
    ind: string,
    s: string,
    e: string,
    validStartStr: string,
  ) => {
    if (!s || !e) return "";
    const hs = parseInt(s);
    const he = parseInt(e);
    if (isNaN(hs) || isNaN(he)) return "";

    if (s.padStart(2, "0") === validStartStr)
      return `SOP Error: ${ind} tidak boleh dimulai tepat di awal validitas TAF (${validStartStr}Z). Masukkan ke Cuaca Utama.`;
    let d = he - hs;
    if (d < 0) d += 24;
    if (ind.includes("TEMPO") && d > 4)
      return `SOP Error: Maks durasi TEMPO 4 jam.`;
    if (ind.includes("BECMG") && d > 3)
      return `SOP Error: Maks durasi BECMG 3 jam.`;
    return "";
  };

  const validateCgWindStrict = (
    mDir: string,
    mSpd: string,
    mGust: string,
    cDir: string,
    cSpd: string,
    cGust: string,
  ) => {
    if (!cDir && !cSpd) return "";
    const mS = parseInt(mSpd) || 0;
    const cS = parseInt(cSpd) || 0;
    const mG = parseInt(mGust) || 0;
    const cG = parseInt(cGust) || 0;

    let valid = false;
    if (Math.abs(cS - mS) >= 10) valid = true;
    if (mDir !== "VRB" && cDir !== "VRB" && mDir && cDir) {
      let diff = Math.abs(parseInt(cDir) - parseInt(mDir));
      if (diff > 180) diff = 360 - diff;
      if (diff >= 60 && (mS >= 10 || cS >= 10)) valid = true;
    } else if (mDir !== cDir && (mS >= 10 || cS >= 10)) {
      valid = true;
    }
    if (Math.abs(cG - mG) >= 10 && (mS >= 15 || cS >= 15)) valid = true;

    if (!valid)
      return "SOP: Perubahan angin tidak memenuhi syarat signifikan (Cek aturan arah >=60°/kec >=10KT/gust >=10KT).";
    return "";
  };

  const validateCgCloudStrict = (
    cAmt: string,
    cHt: string,
    cTyp: string,
    baseClouds: any[],
  ) => {
    if (!cAmt) return "";
    const isIdentical = baseClouds.some(
      (bc) => bc.amount === cAmt && bc.height === cHt && bc.type === cTyp,
    );
    if (isIdentical)
      return "SOP Error: Awan sama persis dengan Base Forecast (tidak ada perubahan).";

    if (cTyp === "CB" || cTyp === "TCU") return "";
    const baseHasCbTcu = baseClouds.some(
      (bc) => bc.type === "CB" || bc.type === "TCU",
    );
    if (baseHasCbTcu) return "";

    const ht = parseInt(cHt) || 0;
    const thresholds = [1, 2, 5, 10, 15];
    if (thresholds.includes(ht)) return "";
    if (ht < 15 && (cAmt === "BKN" || cAmt === "OVC")) return "";
    if (cAmt === "NSC") return "";

    return "SOP Error: Perubahan awan tidak melintasi threshold batas (100, 200, 500, 1000, 1500 ft) atau BKN/OVC di bawah 1500 ft.";
  };

  // --- PROGRESSIVE WX/VIS CHECKER ---
  const validateProgressiveWxVis = (
    effWx: string,
    cgWx: string,
    hasWx: boolean,
    effVis: string,
    cgVis: string,
    hasVis: boolean,
  ) => {
    if (hasWx && cgWx === "NSW" && !effWx) {
      return "SOP Error: Penggunaan NSW tidak valid karena tidak ada cuaca aktif pada kondisi sebelumnya.";
    }

    const checkVis =
      hasVis && cgVis !== "" ? parseInt(cgVis) : parseInt(effVis) || 9999;
    const checkWx = hasWx && cgWx !== "" ? (cgWx === "NSW" ? "" : cgWx) : effWx;

    if (checkVis < 5000 && !checkWx) {
      return "SOP Error: Visibilitas < 5000m WAJIB memiliki fenomena cuaca signifikan.";
    }
    if (checkWx.includes("FG") && checkVis >= 1000) {
      return `SOP Error: Cuaca FG masih aktif pada visibilitas ${checkVis}m. Centang Cuaca dan pilih NSW untuk membersihkannya.`;
    }
    if (checkWx.includes("BR") && (checkVis < 1000 || checkVis > 5000)) {
      return `SOP Error: Cuaca BR masih aktif pada visibilitas ${checkVis}m. Centang Cuaca dan pilih NSW untuk membersihkannya.`;
    }
    if (
      ["FU", "HZ", "DU", "SA"].some((w) => checkWx.includes(w)) &&
      checkVis > 5000
    ) {
      return `SOP Error: ${checkWx} tidak valid pada visibilitas ${checkVis}m (wajib <= 5000m). Pilih NSW untuk membersihkan.`;
    }
    return "";
  };

  const currentValidStart =
    header.type !== "NORMAL" && header.customValidStart
      ? header.customValidStart.padStart(2, "0")
      : ((parseInt(header.issueTime) + 1) % 24).toString().padStart(2, "0");

  const getEffectiveConditions = (currentIndex: number) => {
    let effVis = weather.visibility;
    let effWx = weather.wx;
    let effWindDir = weather.windDir;
    let effWindSpeed = weather.windSpeed;
    let effWindGust = weather.windGust;
    let effClouds = [...clouds];

    for (let i = 0; i < currentIndex; i++) {
      const cg = changeGroups[i];
      if (cg.indicator === "BECMG") {
        if (cg.hasVis) effVis = cg.visibility;
        if (cg.hasWx) effWx = cg.wx === "NSW" ? "" : cg.wx;
        if (cg.hasWind) {
          effWindDir = cg.windDir;
          effWindSpeed = cg.windSpeed;
          effWindGust = cg.windGust;
        }
        if (cg.hasCloud) {
          effClouds = [
            {
              amount: cg.cloudAmount,
              height: cg.cloudHeight,
              type: cg.cloudType,
            },
          ];
        }
      }
    }
    return { effVis, effWx, effWindDir, effWindSpeed, effWindGust, effClouds };
  };

  useEffect(() => {
    if (!header.date || !header.icao) {
      setTafPreview("Lengkapi Tanggal dan ICAO.");
      return;
    }

    const baseDate = new Date(header.date);
    baseDate.setUTCHours(0, 0, 0, 0);
    const issueHourOriginal = parseInt(header.issueTime);
    const refIssueTime = new Date(baseDate);
    refIssueTime.setUTCHours(issueHourOriginal);

    const mainStartTime = new Date(refIssueTime.getTime() + 60 * 60 * 1000);
    const mainEndTime = new Date(mainStartTime.getTime() + 24 * 60 * 60 * 1000);

    let finalStartObj = mainStartTime;
    const finalEndObj = mainEndTime;

    if (header.type !== "NORMAL" && header.customValidStart) {
      const customStartH = parseInt(header.customValidStart);
      finalStartObj = new Date(refIssueTime);
      finalStartObj.setUTCHours(customStartH);
      if (customStartH < issueHourOriginal) {
        finalStartObj.setUTCDate(finalStartObj.getUTCDate() + 1);
      }
    }

    const dateDD = refIssueTime.getUTCDate().toString().padStart(2, "0");
    const startDDStr = finalStartObj.getUTCDate().toString().padStart(2, "0");
    const endDDStr = finalEndObj.getUTCDate().toString().padStart(2, "0");
    const actualValidStartStr = finalStartObj
      .getUTCHours()
      .toString()
      .padStart(2, "0");
    const validEndStr = finalEndObj.getUTCHours().toString().padStart(2, "0");

    let actualIssueHour = header.issueTime;
    let actualIssueMinute = "00";
    let bbbStr = "";
    if (header.type !== "NORMAL") {
      bbbStr =
        header.type === "AMD"
          ? ` AA${header.sequence}`
          : ` CC${header.sequence}`;
      if (header.customHour)
        actualIssueHour = header.customHour.padStart(2, "0");
      if (header.customMinute)
        actualIssueMinute = header.customMinute.padStart(2, "0");
    }
    const typeStr = header.type !== "NORMAL" ? `${header.type} ` : "";

    let tafString = `FTID40 ${header.icao} ${dateDD}${actualIssueHour}${actualIssueMinute}${bbbStr}\n`;
    tafString += `TAF ${typeStr}${header.icao} ${dateDD}${actualIssueHour}${actualIssueMinute}Z ${startDDStr}${actualValidStartStr}/${endDDStr}${validEndStr} `;

    if (weather.windDir && weather.windSpeed) {
      const gStr = weather.windGust ? `G${padWind(weather.windGust)}` : "";
      tafString += `${weather.windDir}${padWind(weather.windSpeed)}${gStr}KT `;
    }
    if (weather.isCavok) tafString += "CAVOK ";
    else {
      if (weather.visibility) tafString += `${weather.visibility} `;
      if (weather.wx) tafString += `${weather.wx} `;
      if (clouds.length === 1 && clouds[0].amount === "NSC")
        tafString += "NSC ";
      else {
        clouds.forEach((c) => {
          if (c.amount && c.height)
            tafString += `${c.amount}${padCloud(c.height)}${c.type} `;
        });
      }
    }

    changeGroups.forEach((cg) => {
      if (cg.indicator && cg.start && cg.end) {
        let cgStr = "";
        let cgStartDD = startDDStr;
        let cgEndDD = startDDStr;

        const hStart = parseInt(cg.start);
        const hEnd = parseInt(cg.end);

        if (!isNaN(hStart) && hStart < finalStartObj.getUTCHours())
          cgStartDD = endDDStr;
        if (!isNaN(hEnd) && !isNaN(hStart)) {
          if (hEnd <= hStart || hEnd < finalStartObj.getUTCHours())
            cgEndDD = endDDStr;
        }

        if (cg.hasWind && cg.windDir && cg.windSpeed) {
          const gStr = cg.windGust ? `G${padWind(cg.windGust)}` : "";
          cgStr += `${cg.windDir}${padWind(cg.windSpeed)}${gStr}KT `;
        }
        if (cg.hasVis && cg.visibility) cgStr += `${cg.visibility} `;
        if (cg.hasWx && cg.wx) cgStr += `${cg.wx} `;
        if (cg.hasCloud && cg.cloudAmount) {
          if (cg.cloudAmount === "NSC") cgStr += "NSC ";
          else if (cg.cloudHeight)
            cgStr += `${cg.cloudAmount}${padCloud(cg.cloudHeight)}${cg.cloudType} `;
        }
        if (cgStr.trim() !== "") {
          tafString += `\n${cg.indicator} ${cgStartDD}${cg.start.padStart(2, "0")}/${cgEndDD}${cg.end.padStart(2, "0")} ${cgStr.trim()} `;
        }
      }
    });
    setTafPreview(tafString.trim() + "=");
  }, [header, weather, clouds, changeGroups]);

  return (
    <div className="flex flex-col h-full gap-6 relative">
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

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-900">TAF Generator</h1>
        <button
          onClick={handleSaveToDatabase}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
        >
          <Save className="w-5 h-5" /> Simpan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[80vh]">
        {/* KOLOM KIRI */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              1. Header
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Tanggal UTC
                </label>
                <input
                  type="date"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={header.date}
                  onChange={(e) =>
                    setHeader({ ...header, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Siklus TAF Utama
                </label>
                <select
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={header.issueTime}
                  onChange={(e) =>
                    setHeader({ ...header, issueTime: e.target.value })
                  }
                >
                  <option value="23">23:00</option>
                  <option value="05">05:00</option>
                  <option value="11">11:00</option>
                  <option value="17">17:00</option>
                </select>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Jenis TAF
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="border p-2 rounded-lg flex-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={header.type}
                      onChange={(e) =>
                        setHeader({ ...header, type: e.target.value })
                      }
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="AMD">AMD</option>
                      <option value="COR">COR</option>
                    </select>
                    {header.type !== "NORMAL" && (
                      <select
                        className="border p-2 rounded-lg w-20 bg-amber-100 text-amber-900 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                        value={header.sequence}
                        onChange={(e) =>
                          setHeader({ ...header, sequence: e.target.value })
                        }
                      >
                        {["A", "B", "C", "D", "E"].map((seq) => (
                          <option key={seq} value={seq}>
                            {seq}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    ICAO
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    className="w-full border p-2 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    value={header.icao}
                    onChange={(e) =>
                      setHeader({
                        ...header,
                        icao: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
              </div>

              {header.type !== "NORMAL" && (
                <div className="col-span-2 grid grid-cols-2 gap-4 bg-amber-50 p-4 rounded-lg border border-amber-200 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">
                      Jam & Menit Terbit {header.type}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Jam"
                        maxLength={2}
                        className="w-full border border-amber-300 p-2 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-sm"
                        value={header.customHour}
                        onChange={(e) =>
                          setHeader({ ...header, customHour: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        placeholder="Mnt"
                        maxLength={2}
                        className="w-full border border-amber-300 p-2 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-sm"
                        value={header.customMinute}
                        onChange={(e) =>
                          setHeader({ ...header, customMinute: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">
                      Mulai Validitas (Sisa)
                    </label>
                    <input
                      type="text"
                      placeholder="Jam Mulai"
                      maxLength={2}
                      className="w-full border border-amber-300 p-2 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-sm"
                      value={header.customValidStart}
                      onChange={(e) =>
                        setHeader({
                          ...header,
                          customValidStart: e.target.value,
                        })
                      }
                    />
                  </div>
                  <p className="col-span-2 text-[10px] text-amber-700 leading-tight">
                    *Masukkan waktu aktual {header.type} dibuat, dan jam
                    dimulainya sisa periode validitas. Sisa batas akhir
                    validitas akan mengikuti siklus utama.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-semibold">2. Utama</h2>
              <label className="flex items-center gap-2 font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full cursor-pointer hover:bg-blue-100">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded"
                  checked={weather.isCavok}
                  onChange={(e) =>
                    setWeather({ ...weather, isCavok: e.target.checked })
                  }
                />{" "}
                CAVOK
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Arah
                </label>
                <input
                  type="text"
                  maxLength={3}
                  className="w-full border p-2 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  value={weather.windDir}
                  onChange={(e) =>
                    setWeather({
                      ...weather,
                      windDir: e.target.value.toUpperCase(),
                    })
                  }
                  onBlur={(e) =>
                    setWeather({
                      ...weather,
                      windDir: formatWindDir(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Kec
                </label>
                <input
                  type="text"
                  maxLength={2}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={weather.windSpeed}
                  onChange={(e) =>
                    setWeather({ ...weather, windSpeed: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Gust
                </label>
                <input
                  type="text"
                  maxLength={2}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={weather.windGust}
                  onChange={(e) =>
                    setWeather({ ...weather, windGust: e.target.value })
                  }
                />
              </div>
            </div>
            {!weather.isCavok && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Vis
                    </label>
                    <select
                      className="w-full border p-2 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={weather.visibility}
                      onChange={(e) =>
                        setWeather({ ...weather, visibility: e.target.value })
                      }
                    >
                      <option value="">Pilih</option>
                      {VISIBILITY_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v} m
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Wx
                    </label>
                    <select
                      className="w-full border p-2 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={weather.wx}
                      onChange={(e) =>
                        setWeather({ ...weather, wx: e.target.value })
                      }
                    >
                      {WX_OPTIONS_MAIN.map((wx) => (
                        <option key={wx.value} value={wx.value}>
                          {wx.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {validateWxVis(weather.wx, weather.visibility) && (
                  <div className="text-red-600 font-medium text-xs flex items-center gap-1 bg-red-100 p-2 rounded border border-red-300">
                    <AlertTriangle className="w-4 h-4 min-w-[16px]" />{" "}
                    <span>{validateWxVis(weather.wx, weather.visibility)}</span>
                  </div>
                )}
                {getBaseWarnings(
                  weather.visibility,
                  weather.wx,
                  clouds,
                  changeGroups,
                ).map((warn, idx) => (
                  <div
                    key={`base-warn-${idx}`}
                    className="mt-2 text-amber-700 font-medium text-xs flex items-start gap-1.5 bg-amber-50 p-2 rounded border border-amber-300"
                  >
                    <Lightbulb className="w-4 h-4 min-w-[16px] text-amber-500" />{" "}
                    <span>{warn}</span>
                  </div>
                ))}

                <div className="bg-slate-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Awan
                    </span>
                    <button
                      onClick={addCloud}
                      disabled={clouds.length >= 4}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  </div>
                  {clouds.map((c, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-4 gap-2 mb-2 items-center"
                    >
                      <select
                        className="border p-1 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={c.amount}
                        onChange={(e) =>
                          updateCloud(idx, "amount", e.target.value)
                        }
                      >
                        <option value="">Pilih</option>
                        <option value="FEW">FEW</option>
                        <option value="SCT">SCT</option>
                        <option value="BKN">BKN</option>
                        <option value="OVC">OVC</option>
                        <option value="NSC">NSC</option>
                      </select>
                      <input
                        type="text"
                        maxLength={3}
                        disabled={c.amount === "NSC"}
                        className="border p-1 rounded text-sm disabled:bg-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={c.height}
                        onChange={(e) =>
                          updateCloud(idx, "height", e.target.value)
                        }
                      />
                      <select
                        disabled={c.amount === "NSC"}
                        className="border p-1 rounded text-sm disabled:bg-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={c.type}
                        onChange={(e) =>
                          updateCloud(idx, "type", e.target.value)
                        }
                      >
                        <option value="">Biasa</option>
                        <option value="CB">CB</option>
                        <option value="TCU">TCU</option>
                      </select>
                      {idx > 0 && (
                        <button
                          onClick={() => removeCloud(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CloudLightning className="w-5 h-5" /> 3. Change Group
              </h2>
              <button
                onClick={addChangeGroup}
                disabled={changeGroups.length >= 5}
                className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200 font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
            {changeGroups.map((cg, idx) => {
              const eff = getEffectiveConditions(idx);
              return (
                <div
                  key={idx}
                  className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg mb-4 relative shadow-sm"
                >
                  <button
                    onClick={() => removeChangeGroup(idx)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <select
                      className="border p-1 rounded text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={cg.indicator}
                      onChange={(e) =>
                        updateChangeGroup(idx, "indicator", e.target.value)
                      }
                    >
                      <option value="TEMPO">TEMPO</option>
                      <option value="BECMG">BECMG</option>
                      <option value="PROB30 TEMPO">PROB30 TEMPO</option>
                      <option value="PROB40 TEMPO">PROB40 TEMPO</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Jam Mulai"
                      maxLength={2}
                      className="border p-1 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={cg.start}
                      onChange={(e) =>
                        updateChangeGroup(idx, "start", e.target.value)
                      }
                    />
                    <input
                      type="text"
                      placeholder="Jam Selesai"
                      maxLength={2}
                      className="border p-1 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={cg.end}
                      onChange={(e) =>
                        updateChangeGroup(idx, "end", e.target.value)
                      }
                    />
                  </div>
                  {validateDuration(
                    cg.indicator,
                    cg.start,
                    cg.end,
                    currentValidStart,
                  ) && (
                    <div className="mb-3 text-red-600 font-medium text-xs flex items-center gap-1 bg-red-100 p-2 rounded border border-red-300">
                      <AlertTriangle className="w-4 h-4 min-w-[16px]" />{" "}
                      <span>
                        {validateDuration(
                          cg.indicator,
                          cg.start,
                          cg.end,
                          currentValidStart,
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-4 mb-3 text-sm">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="rounded text-indigo-600"
                        checked={cg.hasWind}
                        onChange={(e) =>
                          updateChangeGroup(idx, "hasWind", e.target.checked)
                        }
                      />{" "}
                      Angin
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="rounded text-indigo-600"
                        checked={cg.hasVis}
                        onChange={(e) =>
                          updateChangeGroup(idx, "hasVis", e.target.checked)
                        }
                      />{" "}
                      Vis
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="rounded text-indigo-600"
                        checked={cg.hasWx}
                        onChange={(e) =>
                          updateChangeGroup(idx, "hasWx", e.target.checked)
                        }
                      />{" "}
                      Cuaca
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="rounded text-indigo-600"
                        checked={cg.hasCloud}
                        onChange={(e) =>
                          updateChangeGroup(idx, "hasCloud", e.target.checked)
                        }
                      />{" "}
                      Awan
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {cg.hasWind && (
                      <div className="col-span-2 flex gap-2">
                        <input
                          type="text"
                          placeholder="Arah"
                          maxLength={3}
                          className="w-16 border p-1 text-sm rounded uppercase"
                          value={cg.windDir}
                          onChange={(e) =>
                            updateChangeGroup(
                              idx,
                              "windDir",
                              e.target.value.toUpperCase(),
                            )
                          }
                          onBlur={(e) =>
                            updateChangeGroup(
                              idx,
                              "windDir",
                              formatWindDir(e.target.value),
                            )
                          }
                        />
                        <input
                          type="text"
                          placeholder="Kec"
                          maxLength={2}
                          className="w-16 border p-1 text-sm rounded"
                          value={cg.windSpeed}
                          onChange={(e) =>
                            updateChangeGroup(idx, "windSpeed", e.target.value)
                          }
                        />
                        <input
                          type="text"
                          placeholder="Gust"
                          maxLength={2}
                          className="w-16 border p-1 text-sm rounded"
                          value={cg.windGust}
                          onChange={(e) =>
                            updateChangeGroup(idx, "windGust", e.target.value)
                          }
                        />
                      </div>
                    )}
                    {cg.hasVis && (
                      <select
                        className="border p-1 text-sm rounded bg-white"
                        value={cg.visibility}
                        onChange={(e) =>
                          updateChangeGroup(idx, "visibility", e.target.value)
                        }
                      >
                        <option value="">Visibilitas</option>
                        {VISIBILITY_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v} m
                          </option>
                        ))}
                      </select>
                    )}
                    {cg.hasWx && (
                      <select
                        className="border p-1 text-sm rounded bg-white"
                        value={cg.wx}
                        onChange={(e) =>
                          updateChangeGroup(idx, "wx", e.target.value)
                        }
                      >
                        <option value="">Pilih Cuaca</option>
                        {WX_OPTIONS_CG.map((wx) => (
                          <option key={wx.value} value={wx.value}>
                            {wx.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {cg.hasCloud && (
                      <div className="col-span-2 flex gap-2">
                        <select
                          className="border p-1 rounded text-sm bg-white"
                          value={cg.cloudAmount}
                          onChange={(e) =>
                            updateChangeGroup(
                              idx,
                              "cloudAmount",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">Jumlah</option>
                          <option value="FEW">FEW</option>
                          <option value="SCT">SCT</option>
                          <option value="BKN">BKN</option>
                          <option value="OVC">OVC</option>
                          <option value="NSC">NSC</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Tinggi"
                          maxLength={3}
                          disabled={cg.cloudAmount === "NSC"}
                          className="w-16 border p-1 text-sm rounded disabled:bg-slate-200"
                          value={cg.cloudHeight}
                          onChange={(e) =>
                            updateChangeGroup(
                              idx,
                              "cloudHeight",
                              e.target.value,
                            )
                          }
                        />
                        <select
                          disabled={cg.cloudAmount === "NSC"}
                          className="border p-1 rounded text-sm disabled:bg-slate-200 bg-white"
                          value={cg.cloudType}
                          onChange={(e) =>
                            updateChangeGroup(idx, "cloudType", e.target.value)
                          }
                        >
                          <option value="">Tipe</option>
                          <option value="CB">CB</option>
                          <option value="TCU">TCU</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {validateProgressiveWxVis(
                    eff.effWx,
                    cg.wx,
                    cg.hasWx,
                    eff.effVis,
                    cg.visibility,
                    cg.hasVis,
                  ) && (
                    <div className="mt-2 text-red-600 font-medium text-xs flex items-center gap-1 bg-red-100 p-1 rounded border border-red-300">
                      <AlertTriangle className="w-4 h-4 min-w-[16px]" />{" "}
                      <span>
                        {validateProgressiveWxVis(
                          eff.effWx,
                          cg.wx,
                          cg.hasWx,
                          eff.effVis,
                          cg.visibility,
                          cg.hasVis,
                        )}
                      </span>
                    </div>
                  )}

                  {cg.hasVis &&
                    validateCgVisibilityStrict(eff.effVis, cg.visibility) && (
                      <div className="mt-1 text-red-600 font-medium text-xs flex items-center gap-1 bg-red-100 p-1 rounded border border-red-300">
                        <AlertTriangle className="w-4 h-4 min-w-[16px]" />{" "}
                        <span>
                          {validateCgVisibilityStrict(
                            eff.effVis,
                            cg.visibility,
                          )}
                        </span>
                      </div>
                    )}

                  {cg.hasWind &&
                    validateCgWindStrict(
                      eff.effWindDir,
                      eff.effWindSpeed,
                      eff.effWindGust,
                      cg.windDir,
                      cg.windSpeed,
                      cg.windGust,
                    ) && (
                      <div className="mt-1 text-red-600 font-medium text-xs flex items-center gap-1 bg-red-100 p-1 rounded border border-red-300">
                        <AlertTriangle className="w-4 h-4 min-w-[16px]" />{" "}
                        <span>
                          {validateCgWindStrict(
                            eff.effWindDir,
                            eff.effWindSpeed,
                            eff.effWindGust,
                            cg.windDir,
                            cg.windSpeed,
                            cg.windGust,
                          )}
                        </span>
                      </div>
                    )}
                  {cg.hasCloud &&
                    validateCgCloudStrict(
                      cg.cloudAmount,
                      cg.cloudHeight,
                      cg.cloudType,
                      eff.effClouds,
                    ) && (
                      <div className="mt-1 text-red-600 font-medium text-xs flex items-center gap-1 bg-red-100 p-1 rounded border border-red-300">
                        <AlertTriangle className="w-4 h-4 min-w-[16px]" />{" "}
                        <span>
                          {validateCgCloudStrict(
                            cg.cloudAmount,
                            cg.cloudHeight,
                            cg.cloudType,
                            eff.effClouds,
                          )}
                        </span>
                      </div>
                    )}
                  {getCgWarnings(cg, eff).map((warn, wIdx) => (
                    <div
                      key={`cg-warn-${wIdx}`}
                      className="mt-2 text-amber-700 font-medium text-xs flex items-start gap-1.5 bg-amber-50 p-2 rounded border border-amber-300"
                    >
                      <Lightbulb className="w-4 h-4 min-w-[16px] text-amber-500" />{" "}
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Preview TAF
              </h3>
              <button
                onClick={() => {
                  if (!tafPreview || tafPreview.includes("Lengkapi")) return;
                  if (!weather.windDir || !weather.windSpeed)
                    return showToast(
                      "SOP Error: Angin utama wajib diisi!",
                      "error",
                    );
                  if (!weather.isCavok) {
                    if (!weather.visibility)
                      return showToast(
                        "SOP Error: Visibilitas utama wajib diisi!",
                        "error",
                      );
                    if (!clouds[0].amount)
                      return showToast(
                        "SOP Error: Awan utama wajib diisi!",
                        "error",
                      );
                  }
                  navigator.clipboard.writeText(tafPreview);
                  showToast(
                    "Sandi TAF berhasil disalin ke clipboard!",
                    "success",
                  );
                }}
                className="text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold border border-blue-100"
              >
                <Copy className="w-4 h-4" /> Salin
              </button>
            </div>
            <div className="text-blue-800 font-bold bg-blue-50/50 p-4 rounded-lg font-mono text-lg whitespace-pre-wrap leading-relaxed border border-blue-100">
              {tafPreview}
            </div>
          </div>

          {recommendedTaf && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl shadow-sm border border-blue-200">
              <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" /> Rekomendasi
                TAF ECMWF
              </h3>
              <div className="text-blue-800 font-mono text-sm whitespace-pre-wrap">
                {recommendedTaf}
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-blue-900 uppercase flex items-center gap-2">
                <LineChart className="w-4 h-4" /> ECMWF 24 Jam
              </h3>
              <button
                onClick={fetchEcmwfData}
                disabled={isEcmwfLoading}
                className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full hover:bg-emerald-200 font-medium transition-colors"
              >
                {isEcmwfLoading ? "Memuat..." : "Tampilkan Panduan"}
              </button>
            </div>
            {ecmwfData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Klik 'Tampilkan Panduan' untuk NWP.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-50 shadow-sm">
                    <tr className="text-slate-600">
                      <th className="p-2 border-b">Tgl</th>
                      <th className="p-2 border-b">Jam (UTC)</th>
                      <th className="p-2 border-b">Arah</th>
                      <th className="p-2 border-b">Kec (KT)</th>
                      <th className="p-2 border-b">Vis</th>
                      <th className="p-2 border-b">Wx</th>
                      <th className="p-2 border-b">Awan</th>
                      <th className="p-2 border-b text-red-600">CAPE</th>
                      <th className="p-2 border-b text-blue-600">CH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecmwfData.map((d, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-medium">{d.dateDD}</td>
                        <td className="p-2 font-bold">{d.hour}</td>
                        <td className="p-2 font-mono">{d.windDir}</td>
                        <td className="p-2 font-mono">{d.windSpd}</td>
                        <td className="p-2 font-mono">{d.vis}</td>
                        <td className="p-2 font-mono font-bold text-amber-700">
                          {d.wx}
                        </td>
                        <td className="p-2 font-mono">{d.cloud}</td>
                        <td className="p-2 font-mono text-red-600">{d.cape}</td>
                        <td className="p-2 font-mono text-blue-600">
                          {d.rain}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-orange-900 uppercase flex items-center gap-2">
                <MapPin className="w-4 h-4" /> BMKG Tiap 3 Jam
              </h3>
              <button
                onClick={fetchBmkgData}
                disabled={isBmkgLoading}
                className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full hover:bg-orange-200 font-medium transition-colors"
              >
                {isBmkgLoading ? "Memuat..." : "Tampilkan Panduan"}
              </button>
            </div>
            {bmkgData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Klik 'Tampilkan Panduan' untuk BMKG.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-50 shadow-sm">
                    <tr className="text-slate-600">
                      <th className="p-2 border-b">Tgl</th>
                      <th className="p-2 border-b">Jam (UTC)</th>
                      <th className="p-2 border-b">Angin</th>
                      <th className="p-2 border-b">Vis</th>
                      <th className="p-2 border-b">Cuaca</th>
                      <th className="p-2 border-b">Awan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bmkgData.map((d, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-medium">{d.dateDD}</td>
                        <td className="p-2 font-bold">{d.hour}</td>
                        <td className="p-2 font-mono text-orange-700">
                          {d.wind}
                        </td>
                        <td className="p-2 font-mono font-bold text-orange-600">
                          {d.visM}
                        </td>
                        <td className="p-2 font-mono font-medium">
                          {d.wxDesc}
                        </td>
                        <td className="p-2 font-mono font-bold text-orange-600">
                          {d.cloudCat}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {recommendedBmkgTaf && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-xl shadow-sm border border-orange-200 mt-[-10px]">
              <h3 className="text-orange-900 font-bold flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-orange-500" /> Rekomendasi
                TAF BMKG
              </h3>
              <div className="text-orange-800 font-mono text-sm whitespace-pre-wrap">
                {recommendedBmkgTaf}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-blue-900">
          <MapPin className="w-5 h-5" /> 4. Peta Cuaca & Indeks BMKG
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase">
                Streamline 3000ft
              </h3>
              {header.date && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStreamlineOffset((p) => p - 1);
                      setStreamlineError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Mundur 1 Hari"
                  >
                    « Prev
                  </button>
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded shadow-inner min-w-[85px] text-center">
                    {streamlineInfo.displayDate}
                  </span>
                  <button
                    onClick={() => {
                      setStreamlineOffset((p) => p + 1);
                      setStreamlineError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Maju 1 Hari"
                  >
                    Next »
                  </button>
                </div>
              )}
            </div>
            <div className="w-full flex-grow overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] relative group">
              {header.date ? (
                streamlineError ? (
                  <p className="text-xs text-slate-500 font-medium text-center p-4">
                    Gambar untuk {streamlineInfo.displayDate} tidak tersedia.
                  </p>
                ) : (
                  <img
                    key={streamlineInfo.url}
                    src={streamlineInfo.url}
                    alt={`Streamline BMKG ${streamlineInfo.displayDate}`}
                    className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() =>
                      setLightbox({ isOpen: true, type: "STREAMLINE" })
                    }
                    onError={() => setStreamlineError(true)}
                  />
                )
              ) : (
                <p className="text-xs text-slate-400">
                  Pilih tanggal pada Header TAF.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase">
                K-Index (Potensi TS)
              </h3>
              {header.date && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setKiOffset((p) => p - 3);
                      setKiError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Mundur 3 Jam"
                  >
                    « -3h
                  </button>
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded shadow-inner min-w-[110px] text-center">
                    {kiInfo.displayDate}
                  </span>
                  <button
                    onClick={() => {
                      setKiOffset((p) => p + 3);
                      setKiError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Maju 3 Jam"
                  >
                    +3h »
                  </button>
                </div>
              )}
            </div>
            <div className="w-full flex-grow overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] relative group">
              {header.date ? (
                kiError ? (
                  <p className="text-xs text-slate-500 font-medium text-center p-4">
                    Gambar K-Index untuk {kiInfo.displayDate} tidak tersedia.
                  </p>
                ) : (
                  <img
                    key={kiInfo.url}
                    src={kiInfo.url}
                    alt={`K-Index ${kiInfo.displayDate}`}
                    className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setLightbox({ isOpen: true, type: "KI" })}
                    onError={() => setKiError(true)}
                  />
                )
              ) : (
                <p className="text-xs text-slate-400">
                  Pilih tanggal pada Header TAF.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase">
                Lifted Index
              </h3>
              {header.date && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setLiOffset((p) => p - 6);
                      setLiError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Mundur 6 Jam"
                  >
                    « -6h
                  </button>
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded shadow-inner min-w-[110px] text-center">
                    {liInfo.displayDate}
                  </span>
                  <button
                    onClick={() => {
                      setLiOffset((p) => p + 6);
                      setLiError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Maju 6 Jam"
                  >
                    +6h »
                  </button>
                </div>
              )}
            </div>
            <div className="w-full flex-grow overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] relative group">
              {header.date ? (
                liError ? (
                  <p className="text-xs text-slate-500 font-medium text-center p-4">
                    Gambar Lifted Index untuk {liInfo.displayDate} tidak
                    tersedia.
                  </p>
                ) : (
                  <img
                    key={liInfo.url}
                    src={liInfo.url}
                    alt={`Lifted Index ${liInfo.displayDate}`}
                    className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setLightbox({ isOpen: true, type: "LI" })}
                    onError={() => setLiError(true)}
                  />
                )
              ) : (
                <p className="text-xs text-slate-400">
                  Pilih tanggal pada Header TAF.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase">
                Showalter Index
              </h3>
              {header.date && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSiOffset((p) => p - 6);
                      setSiError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Mundur 6 Jam"
                  >
                    « -6h
                  </button>
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded shadow-inner min-w-[110px] text-center">
                    {siInfo.displayDate}
                  </span>
                  <button
                    onClick={() => {
                      setSiOffset((p) => p + 6);
                      setSiError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Maju 6 Jam"
                  >
                    +6h »
                  </button>
                </div>
              )}
            </div>
            <div className="w-full flex-grow overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] relative group">
              {header.date ? (
                siError ? (
                  <p className="text-xs text-slate-500 font-medium text-center p-4">
                    Gambar Showalter Index untuk {siInfo.displayDate} tidak
                    tersedia.
                  </p>
                ) : (
                  <img
                    key={siInfo.url}
                    src={siInfo.url}
                    alt={`Showalter Index ${siInfo.displayDate}`}
                    className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setLightbox({ isOpen: true, type: "SI" })}
                    onError={() => setSiError(true)}
                  />
                )
              ) : (
                <p className="text-xs text-slate-400">
                  Pilih tanggal pada Header TAF.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-blue-700 uppercase">
                  Precipitation
                </h3>
                <select
                  className="text-xs border rounded p-1 outline-none font-semibold text-slate-600 bg-slate-50"
                  value={rainType}
                  onChange={(e) => {
                    setRainType(e.target.value as "HOURLY" | "DAILY");
                    setRainOffset(0);
                    setRainError(false);
                  }}
                >
                  <option value="HOURLY">Hourly (1 Jam)</option>
                  <option value="DAILY">Daily (24 Jam)</option>
                </select>
              </div>
              {header.date && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRainOffset(
                        (p) => p - (rainType === "HOURLY" ? 1 : 24),
                      );
                      setRainError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                  >
                    « -{rainType === "HOURLY" ? "1h" : "1d"}
                  </button>
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded shadow-inner min-w-[110px] text-center">
                    {rainInfo.displayDate}
                  </span>
                  <button
                    onClick={() => {
                      setRainOffset(
                        (p) => p + (rainType === "HOURLY" ? 1 : 24),
                      );
                      setRainError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                  >
                    +{rainType === "HOURLY" ? "1h" : "1d"} »
                  </button>
                </div>
              )}
            </div>
            <div className="w-full flex-grow overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] relative group">
              {header.date ? (
                rainError ? (
                  <p className="text-xs text-slate-500 font-medium text-center p-4">
                    Gambar Curah Hujan untuk {rainInfo.displayDate} tidak
                    tersedia.
                  </p>
                ) : (
                  <img
                    key={rainInfo.url}
                    src={rainInfo.url}
                    alt={`Precipitation ${rainInfo.displayDate}`}
                    className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setLightbox({ isOpen: true, type: "RAIN" })}
                    onError={() => setRainError(true)}
                  />
                )
              ) : (
                <p className="text-xs text-slate-400">
                  Pilih tanggal pada Header TAF.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-emerald-700 uppercase">
                  Rel. Humidity
                </h3>
                <select
                  className="text-xs border rounded p-1 outline-none font-semibold text-slate-600 bg-slate-50"
                  value={rhLevel}
                  onChange={(e) => {
                    setRhLevel(e.target.value);
                    setRhOffset(0);
                    setRhError(false);
                  }}
                >
                  <option value="850mb">850 hPa</option>
                  <option value="700mb">700 hPa</option>
                  <option value="500mb">500 hPa</option>
                </select>
              </div>
              {header.date && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRhOffset((p) => p - 3);
                      setRhError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Mundur 3 Jam"
                  >
                    « -3h
                  </button>
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded shadow-inner min-w-[110px] text-center">
                    {rhInfo.displayDate}
                  </span>
                  <button
                    onClick={() => {
                      setRhOffset((p) => p + 3);
                      setRhError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Maju 3 Jam"
                  >
                    +3h »
                  </button>
                </div>
              )}
            </div>
            <div className="w-full flex-grow overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] relative group">
              {header.date ? (
                rhError ? (
                  <p className="text-xs text-slate-500 font-medium text-center p-4">
                    Gambar RH untuk {rhInfo.displayDate} tidak tersedia.
                  </p>
                ) : (
                  <img
                    key={rhInfo.url}
                    src={rhInfo.url}
                    alt={`Relative Humidity ${rhInfo.displayDate}`}
                    className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setLightbox({ isOpen: true, type: "RH" })}
                    onError={() => setRhError(true)}
                  />
                )
              ) : (
                <p className="text-xs text-slate-400">
                  Pilih tanggal pada Header TAF.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-indigo-700 uppercase">
                  Wind Chart
                </h3>
                <select
                  className="text-xs border rounded p-1 outline-none font-semibold text-slate-600 bg-slate-50"
                  value={windLevel}
                  onChange={(e) => {
                    setWindLevel(e.target.value);
                    setWindOffset(0);
                    setWindError(false);
                  }}
                >
                  <option value="10m">Surface (10m)</option>
                  <option value="925mb">925 hPa</option>
                  <option value="850mb">850 hPa</option>
                  <option value="700mb">700 hPa</option>
                  <option value="500mb">500 hPa</option>
                </select>
              </div>
              {header.date && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setWindOffset((p) => p - 3);
                      setWindError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Mundur 3 Jam"
                  >
                    « -3h
                  </button>
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded shadow-inner min-w-[110px] text-center">
                    {windInfo.displayDate}
                  </span>
                  <button
                    onClick={() => {
                      setWindOffset((p) => p + 3);
                      setWindError(false);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                    title="Maju 3 Jam"
                  >
                    +3h »
                  </button>
                </div>
              )}
            </div>
            <div className="w-full flex-grow overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] relative group">
              {header.date ? (
                windError ? (
                  <p className="text-xs text-slate-500 font-medium text-center p-4">
                    Gambar Wind Chart untuk {windInfo.displayDate} tidak
                    tersedia.
                  </p>
                ) : (
                  <img
                    key={windInfo.url}
                    src={windInfo.url}
                    alt={`Wind Chart ${windInfo.displayDate}`}
                    className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setLightbox({ isOpen: true, type: "WIND" })}
                    onError={() => setWindError(true)}
                  />
                )
              ) : (
                <p className="text-xs text-slate-400">
                  Pilih tanggal pada Header TAF.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-purple-700 uppercase">
                OLR Forecasts
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const idx = olrDaysArr.indexOf(olrDay);
                    if (idx > 0) {
                      setOlrDay(olrDaysArr[idx - 1]);
                      setOlrError(false);
                    }
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                >
                  « Prev
                </button>
                <select
                  className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded shadow-inner min-w-[85px] outline-none text-center"
                  value={olrDay}
                  onChange={(e) => {
                    setOlrDay(e.target.value);
                    setOlrError(false);
                  }}
                >
                  {olrDaysArr.map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const idx = olrDaysArr.indexOf(olrDay);
                    if (idx < olrDaysArr.length - 1) {
                      setOlrDay(olrDaysArr[idx + 1]);
                      setOlrError(false);
                    }
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors shadow-sm"
                >
                  Next »
                </button>
              </div>
            </div>
            <div className="w-full flex-grow overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[200px] relative group">
              {olrError ? (
                <p className="text-xs text-slate-500 font-medium text-center p-4">
                  Gambar OLR untuk Day {olrDay} tidak tersedia.
                </p>
              ) : (
                <img
                  key={olrInfo.url}
                  src={olrInfo.url}
                  alt={`OLR Day ${olrDay}`}
                  className="w-full h-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                  onClick={() => setLightbox({ isOpen: true, type: "OLR" })}
                  onError={() => setOlrError(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {lightbox.isOpen && lightbox.type && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 md:p-10 backdrop-blur-sm">
          <button
            onClick={() => setLightbox({ isOpen: false, type: null })}
            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
          >
            <XCircle className="w-10 h-10" />
          </button>
          <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-5xl mb-6 gap-4">
            <h3 className="text-white font-bold text-xl md:text-2xl tracking-wide">
              {modalTitle}
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={modalPrev}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors shadow-md border border-slate-700"
              >
                « Prev
              </button>
              <span className="text-white font-bold bg-slate-800 px-6 py-2 rounded-lg border border-slate-600 shadow-inner">
                {modalInfo.displayDate}
              </span>
              <button
                onClick={modalNext}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors shadow-md border border-slate-700"
              >
                Next »
              </button>
            </div>
          </div>
          <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
            {modalError ? (
              <div className="text-slate-400 text-lg flex flex-col items-center gap-3">
                <AlertTriangle className="w-12 h-12 text-slate-500" />
                <p>
                  Gambar untuk {modalInfo.displayDate} tidak tersedia di server
                  BMKG.
                </p>
              </div>
            ) : (
              <img
                key={modalInfo.url}
                src={modalInfo.url}
                alt={modalTitle}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl bg-white"
                onError={() => {
                  if (lightbox.type === "STREAMLINE") setStreamlineError(true);
                  else if (lightbox.type === "KI") setKiError(true);
                  else if (lightbox.type === "LI") setLiError(true);
                  else if (lightbox.type === "SI") setSiError(true);
                  else if (lightbox.type === "RAIN") setRainError(true);
                  else if (lightbox.type === "RH") setRhError(true);
                  else if (lightbox.type === "WIND") setWindError(true);
                  else if (lightbox.type === "OLR") setOlrError(true);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
