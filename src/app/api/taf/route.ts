import { NextResponse } from "next/server";
import pool from "@/lib/db"; // Mengambil koneksi database yang sudah kita buat

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { icao_code, issue_time, validity, type, raw_taf } = body;

    // Validasi input dasar
    if (!icao_code || !issue_time || !validity || !raw_taf) {
      return NextResponse.json(
        { success: false, error: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    // Insert ke tabel tafs
    const query = `
      INSERT INTO tafs (icao_code, issue_time, validity, type, raw_taf) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [icao_code, issue_time, validity, type, raw_taf];

    const [result] = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      message: "TAF berhasil disimpan!",
      data: result,
    });
  } catch (error: any) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan ke database" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // Menggunakan pool koneksi yang sama, jauh lebih efisien!
    const [rows] = await pool.query(
      "SELECT * FROM tafs ORDER BY created_at DESC LIMIT 50",
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("DB Get Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { success: false, error: "ID hilang" },
        { status: 400 },
      );
    const query = `DELETE FROM tafs WHERE id = ?`;
    const [result]: any = await pool.query(query, [id]);

    return NextResponse.json({
      success: true,
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Database Error (DELETE):", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus data" },
      { status: 500 },
    );
  }
}
