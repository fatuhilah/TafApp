"use client";

import { useState } from "react";
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
} from "lucide-react";

export default function ValidatorPage() {
  const [rawTaf, setRawTaf] = useState("");
  const [validationResults, setValidationResults] = useState<
    { type: string; message: string }[] | null
  >(null);

  const handleValidate = () => {
    if (!rawTaf.trim()) {
      setValidationResults([
        { type: "error", message: "Teks TAF tidak boleh kosong." },
      ]);
      return;
    }

    const errors: { type: string; message: string }[] = [];
    const warnings: { type: string; message: string }[] = [];
    let originalText = rawTaf.toUpperCase().replace(/\s+/g, " ").trim();

    // --- MENGABAIKAN HEADER WMO & MENANGKAP INDIKATOR BBB ---
    // Potong string mulai dari kata "TAF" namun simpan info WMO Header-nya
    const preTafText = originalText.split("TAF")[0];
    let bbbIndicator = "";

    // Cari indikator seperti AAA, CCA, RRA pada string sebelum TAF
    const bbbMatch = preTafText.match(/\b([ACR][A-Z]{2})\b/);
    if (bbbMatch) {
      bbbIndicator = bbbMatch[1];
    }

    let text = originalText;
    const tafStartIndex = text.indexOf("TAF");
    if (tafStartIndex !== -1) {
      text = text.substring(tafStartIndex);
    }

    // Cek keselarasan WMO Header dengan Jenis TAF
    const isAmd = text.includes("TAF AMD");
    const isCor = text.includes("TAF COR");

    if (isAmd && bbbIndicator && !bbbIndicator.startsWith("AA")) {
      errors.push({
        type: "error",
        message: `SOP Error: TAF AMD (Amandemen) harus menggunakan indikator amandemen (AAA, AAB, dst) pada WMO Header. Ditemukan: '${bbbIndicator}'.`,
      });
    }
    if (isCor && bbbIndicator && !bbbIndicator.startsWith("CC")) {
      errors.push({
        type: "error",
        message: `SOP Error: TAF COR (Koreksi) harus menggunakan indikator koreksi (CCA, CCB, dst) pada WMO Header. Ditemukan: '${bbbIndicator}'.`,
      });
    }

    // 1. Cek Akhiran Tanda '='
    if (!text.endsWith("=")) {
      errors.push({
        type: "error",
        message:
          "SOP Error: Sandi TAF harus diakhiri dengan tanda sama dengan (=) tanpa spasi.",
      });
    }

    // --- TOKEN SCANNER: DETEKSI TYPO DAN CUACA TIDAK VALID ---
    const validWxCodes = [
      "DZ",
      "RA",
      "SHRA",
      "-TS",
      "TS",
      "+TS",
      "TSRA",
      "BR",
      "FG",
      "HZ",
      "FU",
      "VA",
      "SQ",
      "FC",
      "NSW",
      "-DZ",
      "-RA",
      "-SHRA",
      "+RA",
      "-TSRA",
      "+TSRA",
      "+SHRA",
    ];
    const icaoMatchForToken = text.match(/TAF\s+(?:AMD\s+|COR\s+)?([A-Z]{4})/);
    const icaoCodeToken = icaoMatchForToken ? icaoMatchForToken[1] : "";
    const knownKeywords = [
      "TAF",
      "AMD",
      "COR",
      "CAVOK",
      "NSC",
      "NSW",
      "BECMG",
      "TEMPO",
      "PROB30",
      "PROB40",
    ];
    if (icaoCodeToken) knownKeywords.push(icaoCodeToken);

    // Bedah semua teks menjadi potongan per kata
    const tokens = text.replace(/=/g, "").split(/\s+/);
    for (const t of tokens) {
      if (!t) continue;
      if (knownKeywords.includes(t)) continue;
      if (/^\d{6}Z$/.test(t)) continue; // Format Jam Terbit
      if (/^\d{4}\/\d{4}$/.test(t)) continue; // Format Validitas
      if (/^(VRB|\d{3})\d{2}(G\d{2})?KT$/.test(t)) continue; // Format Angin
      if (/^\d{4}$/.test(t)) continue; // Format Visibilitas
      if (/^(FEW|SCT|BKN|OVC)\d{3}(CB|TCU)?$/.test(t)) continue; // Format Awan
      if (/^(TX|TN)\d{2}\/\d{4}Z$/.test(t)) continue; // Toleransi format Suhu (TX/TN) jika ada

      // Jika sampai di sini, kata tersebut BUKAN sandi standar.
      // Kita cek apakah itu sandi cuaca yang sah. Jika tidak, itu adalah TYPO!
      if (!validWxCodes.includes(t)) {
        errors.push({
          type: "error",
          message: `SOP Error: Terdeteksi sandi tidak baku atau typo '${t}'. Pastikan sandi cuaca sesuai standar (contoh: -RA, TSRA, BR, dsb) atau pastikan tidak ada spasi yang salah pada awan/angin.`,
        });
      }
    }

    // 2. Ekstraksi Header (Jam Terbit vs Validitas)
    const headerMatch = text.match(
      /TAF\s+(?:AMD\s+|COR\s+)?[A-Z]{4}\s+(\d{2})(\d{2})\d{2}Z\s+(\d{2})(\d{2})\/(\d{2})(\d{2})/,
    );
    let mainStartAbs = 0;
    let mainEndAbs = 0;
    let iDDNum = 0;
    let startHHStr = "";

    if (!headerMatch) {
      errors.push({
        type: "error",
        message:
          "SOP Error: Format header tidak valid. Pastikan format: TAF [AMD/COR] CCCC YYGGggZ Y1Y1G1G1/Y2Y2G2G2",
      });
    } else {
      const [, issueDate, issueHour, startDD, startHH, endDD, endHH] =
        headerMatch;

      iDDNum = parseInt(issueDate);
      const startDDNum = parseInt(startDD);
      const eDDNum = parseInt(endDD);

      startHHStr = startHH;
      const iHour = parseInt(issueHour);
      const sHour = parseInt(startHH);
      const eHour = parseInt(endHH);

      // Normalisasi waktu absolut (dalam hitungan jam) untuk proteksi lintas bulan
      const issueAbs = iDDNum * 24 + iHour;

      let startDDAdj = startDDNum;
      if (startDDNum < iDDNum && iDDNum - startDDNum > 20) startDDAdj += 31;
      mainStartAbs = startDDAdj * 24 + sHour;

      let endDDAdj = eDDNum;
      if (eDDNum < iDDNum && iDDNum - eDDNum > 20) endDDAdj += 31;
      mainEndAbs = endDDAdj * 24 + eHour;

      // VALIDASI WAKTU TERBIT VS AWAL VALIDITAS
      if (isAmd) {
        if (mainStartAbs < issueAbs) {
          errors.push({
            type: "error",
            message: `SOP Error: Untuk TAF AMD, awal validitas (${startDD}${startHH}Z) tidak boleh berada di masa lalu dibandingkan jam terbit revisi (${issueDate}${issueHour}Z). Sesuaikan awal validitas dengan sisa waktu prakiraan.`,
          });
        }
      } else if (isCor) {
        if (mainEndAbs <= issueAbs) {
          errors.push({
            type: "error",
            message: `SOP Error: Waktu terbit TAF COR (${issueDate}${issueHour}Z) sudah melewati batas akhir validitas (${endDD}${endHH}Z). TAF sudah kadaluarsa untuk dikoreksi.`,
          });
        }
        // Catatan: TAF COR diperbolehkan memiliki mainStartAbs < issueAbs karena ia mempertahankan validitas aslinya.
      } else {
        if (mainStartAbs < issueAbs) {
          errors.push({
            type: "error",
            message: `SOP Error: Awal validitas (${startDD}${startHH}Z) tidak boleh mendahului atau berada di masa lalu dibandingkan waktu terbit sandi (${issueDate}${issueHour}Z).`,
          });
        }
        if (mainStartAbs - issueAbs !== 1) {
          errors.push({
            type: "error",
            message: `SOP Error: TAF Normal diterbitkan pada ${issueDate}${issueHour}Z namun validitas dimulai pada ${startDD}${startHH}Z. SOP mewajibkan TAF Normal diterbitkan tepat 1 jam sebelum awal validitas.`,
          });
        }
      }
    }

    // 3. Batas Maksimal Change Group
    const cgRegex = /\b(TEMPO|BECMG|PROB30 TEMPO|PROB40 TEMPO)\b/g;
    const cgMatches = text.match(cgRegex) || [];
    if (cgMatches.length > 5) {
      errors.push({
        type: "error",
        message: `SOP Error: Ditemukan ${cgMatches.length} Change Group. Batas maksimal adalah 5.`,
      });
    }

    // --- MEMISAHKAN KONDISI UTAMA & CHANGE GROUPS ---
    const parts = text.split(/\b(TEMPO|BECMG|PROB30 TEMPO|PROB40 TEMPO)\b/);
    const mainSection = parts[0];

    // --- PARSING KONDISI UTAMA ---
    const mainSafeContent = mainSection
      .replace(/\b\d{4}\/\d{4}\b/g, "")
      .replace(/\b\d{6}Z\b/g, "");

    const mainDigitsMatches = mainSafeContent.match(/\b\d+\b/g) || [];
    let mainVis = 9999;
    let mainVisStr = "9999";
    for (const digits of mainDigitsMatches) {
      if (digits.length === 4) {
        mainVisStr = digits;
        mainVis = parseInt(digits);
      } else {
        errors.push({
          type: "error",
          message: `SOP Error (Utama): Terdeteksi angka '${digits}'. Format visibilitas harus tepat 4 digit angka.`,
        });
      }
    }

    const wxRegexStr =
      "\\b(DZ|RA|SHRA|TS|TSRA|BR|FG|HZ|FU|VA|SQ|FC|NSW|-DZ|-RA|-SHRA|\\+RA|\\+TSRA|\\+SHRA)\\b";
    const wxRegex = new RegExp(wxRegexStr);
    const mainWxMatch = mainSafeContent.match(wxRegex);
    const mainWx = mainWxMatch ? mainWxMatch[0] : "";

    const windMatch = mainSafeContent.match(
      /\b(VRB|\d{3})(\d{2})(?:G(\d{2}))?KT\b/,
    );
    let mainWind = { dir: "", spd: 0, gst: 0 };
    if (windMatch) {
      mainWind.dir = windMatch[1];
      mainWind.spd = parseInt(windMatch[2]);
      mainWind.gst = windMatch[3] ? parseInt(windMatch[3]) : 0;

      if (mainWind.dir !== "VRB" && parseInt(mainWind.dir) % 10 !== 0) {
        errors.push({
          type: "error",
          message: `SOP Error (Utama): Arah angin ${mainWind.dir}° tidak valid. Arah angin harus puluhan (diakhiri angka 0).`,
        });
      }
    } else {
      errors.push({
        type: "error",
        message:
          "SOP Error (Utama): Kelompok angin permukaan tidak valid atau tidak ditemukan.",
      });
    }

    const cloudMatches = mainSafeContent.match(
      /\b(FEW|SCT|BKN|OVC)(\d{3})(?:CB|TCU)?\b/,
    );
    let mainCloud = { amt: "NSC", hgt: 0, typ: "" };
    if (cloudMatches) {
      mainCloud.amt = cloudMatches[1];
      mainCloud.hgt = parseInt(cloudMatches[2]);
      mainCloud.typ = mainSafeContent.includes("CB")
        ? "CB"
        : mainSafeContent.includes("TCU")
          ? "TCU"
          : "";
    }

    // Validasi Wx & Vis Utama
    if (mainVis < 5000 && !mainWx && !mainSection.includes("CAVOK")) {
      errors.push({
        type: "error",
        message: `SOP Error (Utama): Visibilitas ${mainVisStr}m < 5000m WAJIB mencantumkan fenomena cuaca signifikan.`,
      });
    }
    if (mainWx.includes("FG") && mainVis >= 1000) {
      errors.push({
        type: "error",
        message: `SOP Error (Utama): Cuaca FG (Fog) wajib memiliki visibilitas < 1000m.`,
      });
    }
    if (mainWx.includes("BR") && (mainVis < 1000 || mainVis > 5000)) {
      errors.push({
        type: "error",
        message: `SOP Error (Utama): Cuaca BR (Mist) wajib memiliki visibilitas antara 1000m hingga 5000m.`,
      });
    }
    if (
      ["FU", "HZ", "DU", "SA"].some((w) => mainWx.includes(w)) &&
      mainVis > 5000
    ) {
      errors.push({
        type: "error",
        message: `SOP Error (Utama): Cuaca ${mainWx} (Lithometeor) wajib memiliki visibilitas <= 5000m.`,
      });
    }
    if (
      ["FU", "HZ", "DU", "SA"].some((w) => mainWx.includes(w)) &&
      mainVis > 5000
    ) {
      errors.push({
        type: "error",
        message: `SOP Error (Utama): Cuaca ${mainWx} (Lithometeor) wajib memiliki visibilitas <= 5000m.`,
      });
    }
    const hasBecmg = text.includes("BECMG");

    if (mainWx && mainWx !== "NSW" && !hasBecmg) {
      warnings.push({
        type: "warning",
        message: `Meteorological Warning (Utama): Cuaca dasar (Base) disandikan '${mainWx}'. Yakin fenomena ini akan terjadi nonstop 24 jam mendominasi seluruh periode TAF? (Tambahkan BECMG untuk menghentikannya, atau gunakan TEMPO jika fluktuatif). Kalau yakin ya lanjut aja.`,
      });
    }

    if (mainWx.includes("TS") && mainCloud.typ !== "CB") {
      warnings.push({
        type: "warning",
        message: `Meteorological Warning (Utama): Ada sandi petir (${mainWx}) tapi kok tidak ada awan CB? Yakin petir bisa terjadi tanpa awan Cumulonimbus?`,
      });
    }

    // Ganti baris if (mainVis < 1000 && !mainWx.includes("FG")) menjadi:
    if (
      mainVis < 1000 &&
      !mainWx.includes("FG") &&
      !mainWx.includes("RA") &&
      !mainWx.includes("TS")
    ) {
      warnings.push({
        type: "warning",
        message: `Meteorological Warning (Utama): Visibilitas sangat rendah (${mainVisStr}m). Umumnya jarak pandang di bawah 1000m disebabkan oleh kabut tebal (FG) atau hujan sangat lebat. Yakin cuaca yang disandikan adalah '${mainWx || "tidak ada"}'? Kalau yakin ya lanjut aja.`,
      });
    }

    // 4. VALIDASI STRICT CHANGE GROUPS DENGAN PROGRESSIVE STATE ENGINE
    const visThresholds = [150, 350, 600, 800, 1500, 3000, 5000];

    let effVis = mainVis;
    let effVisStr = mainVisStr;
    let effWx = mainWx;
    let effWind = { ...mainWind };
    let effCloud = { ...mainCloud };

    for (let i = 1; i < parts.length; i += 2) {
      const indicator = parts[i];
      const content = parts[i + 1];

      const timeMatch = content.match(/\b(\d{2})(\d{2})\/(\d{2})(\d{2})\b/);
      if (timeMatch) {
        const [, cgStartDD, cgStartHH, cgEndDD, cgEndHH] = timeMatch;
        const h1 = parseInt(cgStartHH);
        const h2 = parseInt(cgEndHH);
        const d1 = parseInt(cgStartDD);
        const d2 = parseInt(cgEndDD);

        let cgStartDDAdj = d1;
        if (d1 < iDDNum && iDDNum - d1 > 20) cgStartDDAdj += 31;
        let cgStartAbs = cgStartDDAdj * 24 + h1;

        let cgEndDDAdj = d2;
        if (d2 < iDDNum && iDDNum - d2 > 20) cgEndDDAdj += 31;
        let cgEndAbs = cgEndDDAdj * 24 + h2;

        // PENCEGAHAN CG DIMULAI BERSAMAAN DENGAN WAKTU AWAL TAF
        if (cgStartAbs === mainStartAbs) {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Periode ${timeMatch[0]} tidak boleh dimulai tepat di awal waktu validitas utama TAF (${startHHStr}Z). Perubahan ini harus dimasukkan langsung ke dalam Kondisi Utama (Base Forecast).`,
          });
        }

        if (cgEndAbs <= cgStartAbs) {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Format waktu ${timeMatch[0]} mundur ke belakang atau tidak logis.`,
          });
        }

        if (
          headerMatch &&
          (cgStartAbs < mainStartAbs || cgEndAbs > mainEndAbs)
        ) {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Waktu ${timeMatch[0]} berada di luar batas periode validitas utama TAF.`,
          });
        }

        let duration = cgEndAbs - cgStartAbs;
        if (indicator.includes("TEMPO") && duration > 4) {
          errors.push({
            type: "error",
            message: `SOP Error: Durasi TEMPO ${timeMatch[0]} adalah ${duration} jam (Maks 4 jam).`,
          });
        }
        if (indicator === "BECMG" && duration > 3) {
          errors.push({
            type: "error",
            message: `SOP Error: Durasi BECMG ${timeMatch[0]} adalah ${duration} jam (Maks 3 jam).`,
          });
        }
      } else {
        errors.push({
          type: "error",
          message: `SOP Error (${indicator}): Format waktu (YYGG/YeYeGeGe) tidak ditemukan.`,
        });
      }

      const cgSafeContent = content.replace(/\b\d{4}\/\d{4}\b/g, "");

      const cgDigitsMatches = cgSafeContent.match(/\b\d+\b/g) || [];
      let cgVisNum: number | null = null;
      let cgVisStrRaw = "";

      for (const digits of cgDigitsMatches) {
        if (digits.length === 4) {
          cgVisStrRaw = digits;
          cgVisNum = parseInt(digits);
        } else {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Terdeteksi angka tak lazim '${digits}'. Visibilitas harus berupa 4 digit angka.`,
          });
        }
      }

      const cgWxMatch = cgSafeContent.match(wxRegex);
      const cgWx = cgWxMatch ? cgWxMatch[0] : "";

      // Evaluasi Visibilitas dibandingkan dengan EFFECTIVE VISIBILITY
      if (cgVisNum !== null) {
        if (cgVisNum === effVis) {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Visibilitas ${cgVisStrRaw}m sama dengan kondisi sebelumnya (tidak ada perubahan).`,
          });
        } else if (cgVisNum !== 9999) {
          let isValidCrossing = false;
          if (effVis < cgVisNum) {
            isValidCrossing = visThresholds.some(
              (t) => effVis < t && t <= cgVisNum,
            );
          } else {
            isValidCrossing = visThresholds.some(
              (t) => effVis > t && t >= cgVisNum,
            );
          }

          if (!isValidCrossing) {
            errors.push({
              type: "error",
              message: `SOP Error (${indicator}): Perubahan visibilitas dari ${effVisStr}m ke ${cgVisStrRaw}m tidak valid (tidak melewati ambang batas: 150, 350, 600, 800, 1500, 3000, 5000).`,
            });
          }
        }
      }

      // Evaluasi Cuaca dibandingkan dengan EFFECTIVE WEATHER
      if (cgWx) {
        if (cgWx === "NSW" && !effWx) {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Penggunaan NSW tidak valid karena tidak ada cuaca aktif pada kondisi sebelumnya.`,
          });
        }
      }

      const checkVis = cgVisNum !== null ? cgVisNum : effVis;
      const checkWx = cgWx ? (cgWx === "NSW" ? "" : cgWx) : effWx;

      if (checkVis < 5000 && !checkWx && !content.includes("CAVOK")) {
        errors.push({
          type: "error",
          message: `SOP Error (${indicator}): Visibilitas ${checkVis}m < 5000m WAJIB memiliki fenomena cuaca signifikan.`,
        });
      }
      if (checkWx.includes("FG") && checkVis >= 1000) {
        errors.push({
          type: "error",
          message: `SOP Error (${indicator}): Cuaca FG (Fog) menuntut visibilitas < 1000m. Terdeteksi Vis: ${checkVis}m. Hapus FG dengan NSW jika visibilitas sudah membaik.`,
        });
      }
      if (checkWx.includes("BR") && (checkVis < 1000 || checkVis > 5000)) {
        errors.push({
          type: "error",
          message: `SOP Error (${indicator}): Cuaca BR (Mist) menuntut visibilitas antara 1000-5000m. Terdeteksi Vis: ${checkVis}m. Pastikan untuk membersihkan BR menggunakan NSW jika jarak pandang melampaui 5000m.`,
        });
      }
      if (
        ["FU", "HZ", "DU", "SA"].some((w) => checkWx.includes(w)) &&
        checkVis > 5000
      ) {
        errors.push({
          type: "error",
          message: `SOP Error (${indicator}): Cuaca ${checkWx} (Lithometeor) tidak valid pada visibilitas ${checkVis}m (wajib <= 5000m). Gunakan NSW untuk membersihkannya jika jarak pandang membaik.`,
        });
      }

      // Evaluasi Angin dibandingkan dengan EFFECTIVE WIND
      const cgWindMatch = cgSafeContent.match(
        /\b(VRB|\d{3})(\d{2})(?:G(\d{2}))?KT\b/,
      );
      let cgDir = "",
        cgSpd = 0,
        cgGst = 0;

      if (cgWindMatch) {
        cgDir = cgWindMatch[1];
        cgSpd = parseInt(cgWindMatch[2]);
        cgGst = cgWindMatch[3] ? parseInt(cgWindMatch[3]) : 0;

        if (cgDir !== "VRB" && parseInt(cgDir) % 10 !== 0) {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Arah angin ${cgDir}° harus satuan puluhan (diakhiri angka 0).`,
          });
        }

        let isDirValid = false;
        let isSpdValid = false;
        let isGstValid = false;

        if (Math.abs(effWind.spd - cgSpd) >= 10) isSpdValid = true;

        if (effWind.dir !== "VRB" && cgDir !== "VRB" && effWind.dir !== "") {
          let diff = Math.abs(
            (parseInt(effWind.dir) || 0) - (parseInt(cgDir) || 0),
          );
          if (diff > 180) diff = 360 - diff;
          if (diff >= 60 && (effWind.spd >= 10 || cgSpd >= 10))
            isDirValid = true;
        } else if (effWind.dir !== cgDir) {
          if (effWind.spd >= 10 || cgSpd >= 10) isDirValid = true;
        }

        if (
          Math.abs(effWind.gst - cgGst) >= 10 &&
          (effWind.spd >= 15 || cgSpd >= 15)
        ) {
          isGstValid = true;
        }

        if (!isDirValid && !isSpdValid && !isGstValid) {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Perubahan angin ke ${cgWindMatch[0]} tidak signifikan jika dibandingkan angin sebelumnya (${effWind.dir}${String(effWind.spd).padStart(2, "0")}KT).`,
          });
        }
      }

      // Evaluasi Awan dibandingkan dengan EFFECTIVE CLOUD
      const cgCloudMatch = cgSafeContent.match(
        /\b(FEW|SCT|BKN|OVC)(\d{3})(?:CB|TCU)?\b/,
      );
      let cgAmt = "NSC",
        cgHgt = 0,
        cgTyp = "";

      if (cgCloudMatch) {
        cgAmt = cgCloudMatch[1];
        cgHgt = parseInt(cgCloudMatch[2]);
        cgTyp = cgSafeContent.includes("CB")
          ? "CB"
          : cgSafeContent.includes("TCU")
            ? "TCU"
            : "";

        if (
          cgAmt === effCloud.amt &&
          cgHgt === effCloud.hgt &&
          cgTyp === effCloud.typ
        ) {
          errors.push({
            type: "error",
            message: `SOP Error (${indicator}): Awan ${cgCloudMatch[0]} persis sama dengan kondisi sebelumnya (tidak ada perubahan).`,
          });
        } else {
          let isValid = false;
          if (cgTyp === "CB" || cgTyp === "TCU") isValid = true;
          else if (effCloud.typ === "CB" || effCloud.typ === "TCU")
            isValid = true;

          if (!isValid) {
            const grpB = ["BKN", "OVC"];
            if (cgHgt < 15 || effCloud.hgt < 15) {
              if (grpB.includes(effCloud.amt) !== grpB.includes(cgAmt))
                isValid = true;
            }

            const cloudThresholds = [1, 2, 5, 10, 15];
            if (effCloud.hgt < cgHgt) {
              if (cloudThresholds.some((t) => effCloud.hgt < t && t <= cgHgt))
                isValid = true;
            } else if (effCloud.hgt > cgHgt) {
              if (cloudThresholds.some((t) => effCloud.hgt > t && t >= cgHgt))
                isValid = true;
            }
          }

          if (!isValid && cgAmt !== "NSC") {
            errors.push({
              type: "error",
              message: `SOP Error (${indicator}): Perubahan awan dari ${effCloud.amt}${String(effCloud.hgt).padStart(3, "0")} ke ${cgCloudMatch[0]} tidak valid. Harus menembus threshold (100, 200, 500, 1000, 1500 ft) atau merubah kategori (BKN/OVC).`,
            });
          }
        }
      } else if (cgSafeContent.includes("NSC")) {
        cgAmt = "NSC";
        cgHgt = 0;
        cgTyp = "";
      }

      // --- LOGIKA WARNING: METEOROLOGIS (CHANGE GROUP) ---
      if (indicator === "BECMG" && cgWx && cgWx !== "NSW") {
        warnings.push({
          type: "warning",
          message: `Meteorological Warning (${indicator}): Yakin nih kondisi cuaca '${cgWx}' akan berlangsung terus-menerus selama sisa durasi validitas TAF? (Cuaca fluktuatif seharusnya disandikan dengan TEMPO). Kalau yakin ya lanjut aja.`,
        });
      }

      const hasActiveCb = cgCloudMatch
        ? cgTyp === "CB"
        : effCloud.typ === "CB" && !cgSafeContent.includes("NSC");

      if (checkWx.includes("TS") && !hasActiveCb) {
        warnings.push({
          type: "warning",
          message: `Meteorological Warning (${indicator}): Terdapat sandi petir (${checkWx}) tapi awan yang sedang aktif bukan CB. Yakin petir terjadi tanpa awan Cumulonimbus? Pastikan untuk merubah tipe awan menjadi CB.`,
        });
      }

      if (
        checkVis < 1000 &&
        !checkWx.includes("FG") &&
        !checkWx.includes("RA") &&
        !checkWx.includes("TS")
      ) {
        warnings.push({
          type: "warning",
          message: `Meteorological Warning (${indicator}): Visibilitas anjlok hingga ${checkVis}m. Umumnya jarak pandang di bawah 1000m disebabkan oleh kabut radiasi/embun (FG) atau hujan lebat. Yakin fenomena saat ini masih '${checkWx || "tidak ada"}' bawaan dari kondisi sebelumnya? Jika ini embun pagi, pastikan ganti cuacanya menjadi FG. Jika ini hujan lebat, pastikan ganti cuacanya menjadi RA/+RA/TSRA/+TSRA. Kalau yakin ya lanjut aja.`,
        });
      }

      // MENG-UPDATE PROGRESSIVE STATE HANYA JIKA ITU BECMG
      if (indicator === "BECMG") {
        if (cgVisNum !== null) {
          effVis = cgVisNum;
          effVisStr = cgVisStrRaw;
        }
        if (cgWx || content.includes("NSW")) {
          effWx = cgWx === "NSW" ? "" : cgWx;
        }
        if (cgWindMatch) {
          effWind = { dir: cgDir, spd: cgSpd, gst: cgGst };
        }
        if (
          cgCloudMatch ||
          content.includes("NSC") ||
          content.includes("CAVOK")
        ) {
          effCloud = { amt: cgAmt, hgt: cgHgt, typ: cgTyp };
        }
      }
    }

    if (errors.length === 0) {
      setValidationResults([
        {
          type: "success",
          message:
            "Sandi TAF valid 100%. Sandi lulus uji State-Engine Progresif dan SOP BMKG.",
        },
        ...warnings,
      ]);
    } else {
      setValidationResults([...errors, ...warnings]);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-blue-600" /> TAF Validator
        </h1>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-slate-500" />
          <h2 className="text-xl font-bold text-slate-800">
            Masukkan Sandi TAF Mentah
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Sistem ini menjalankan <strong>Progressive State Engine</strong> untuk
          memvalidasi sandi TAF berdasarkan SOP WMO/BMKG.
        </p>

        <div className="relative mb-6">
          <textarea
            className="w-full h-48 p-5 bg-slate-50 text-slate-800 font-mono text-lg leading-relaxed rounded-xl border border-slate-300 shadow-inner outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all uppercase resize-none placeholder-slate-400"
            placeholder="Ketik atau Paste TAF di sini..."
            value={rawTaf}
            onChange={(e) => setRawTaf(e.target.value)}
            spellCheck="false"
          ></textarea>
        </div>

        <button
          onClick={handleValidate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
        >
          <Search className="w-6 h-6" /> Pindai & Validasi SOP
        </button>
      </div>

      {validationResults && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-bold mb-6 border-b pb-3 text-slate-800">
            Hasil Pemindaian SOP
          </h2>

          <div className="flex flex-col gap-4">
            {validationResults.map((res, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl flex items-start gap-4 border shadow-sm ${
                  res.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : res.type === "error"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                {res.type === "success" ? (
                  <CheckCircle2 className="w-7 h-7 flex-shrink-0 text-emerald-500 mt-0.5" />
                ) : res.type === "error" ? (
                  <XCircle className="w-7 h-7 flex-shrink-0 text-red-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-7 h-7 flex-shrink-0 text-amber-500 mt-0.5" />
                )}
                <div className="font-medium text-base leading-relaxed">
                  {res.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
