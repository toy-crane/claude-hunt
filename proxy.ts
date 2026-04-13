import { updateSession } from "@shared/api/supabase/proxy.ts";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
