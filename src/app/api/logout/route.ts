import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Hapus cookie dengan nama yang sesuai di actions.ts
    cookieStore.delete("tafapp_auth");

    return NextResponse.json({
      success: true,
      message: "Berhasil logout",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal logout" },
      { status: 500 },
    );
  }
}
