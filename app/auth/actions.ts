"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
