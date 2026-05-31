"use server";

import { createServerClient } from "@shared/api/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
