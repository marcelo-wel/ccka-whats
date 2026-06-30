import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: operator } = await supabase
    .from("operators")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);
  const offset = Number(searchParams.get("offset") ?? "0");

  const admin = createAdminClient();

  const { data, error, count } = await admin
    .from("alert_events")
    .select(
      "id, matched_keyword, seen, created_at, alert_id, alerts(name), messages(id, chat_id, body, type, timestamp)",
      { count: "exact" },
    )
    .eq("tenant_id", operator.tenant_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: operator } = await supabase
    .from("operators")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { ids?: unknown };
  const admin = createAdminClient();

  let query = admin
    .from("alert_events")
    .update({ seen: true })
    .eq("tenant_id", operator.tenant_id)
    .eq("seen", false);

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const ids = body.ids.filter((id): id is string => typeof id === "string");
    query = admin
      .from("alert_events")
      .update({ seen: true })
      .eq("tenant_id", operator.tenant_id)
      .in("id", ids);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
