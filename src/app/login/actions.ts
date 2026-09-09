"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const password = formData.get("password");

  if (password === "opr96607") {
    // PERBAIKAN: Gunakan await karena cookies() sekarang adalah Promise
    const cookieStore = await cookies();

    cookieStore.set("tafapp_auth", "verified", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    redirect("/");
  }

  return { error: "Sandi operasional tidak valid." };
}
