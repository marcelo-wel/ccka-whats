import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

// GET /api/debug/evolution-ping
// Testa conectividade com a Evolution API. Remover após diagnóstico.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = `${env.EVOLUTION_API_URL}/instance/fetchInstances`;
  let result: unknown;
  let ok = false;

  try {
    const res = await fetch(url, {
      headers: { apikey: env.EVOLUTION_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    ok = res.ok;
    const ct = res.headers.get("content-type") ?? "";
    result = ct.includes("application/json")
      ? await res.json()
      : await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const cause = (err instanceof Error && err.cause) ? String(err.cause) : undefined;
    return NextResponse.json({ ok: false, url, error: msg, cause });
  }

  return NextResponse.json({ ok, url, result });
}
