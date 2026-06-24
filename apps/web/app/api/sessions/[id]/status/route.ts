import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: session } = await supabase
    .from("wa_sessions")
    .select("evolution_instance_name")
    .eq("id", id)
    .single();

  if (!session?.evolution_instance_name) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const evoRes = await fetch(
    `${env.EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${session.evolution_instance_name}`,
    { headers: { "apikey": env.EVOLUTION_API_KEY } },
  );

  if (!evoRes.ok) {
    return NextResponse.json({ error: `Evolution: ${evoRes.status}` }, { status: 502 });
  }

  const raw = await evoRes.json() as unknown;

  // Evolution retorna array ou objeto dependendo da versão
  const instances = Array.isArray(raw) ? raw : [raw];
  const instance = instances[0] as Record<string, unknown> | undefined;
  const connectionState = (
    (instance?.instance as Record<string, unknown>)?.state ??
    instance?.state ??
    instance?.connectionStatus ??
    instance?.status
  ) as string | undefined;

  const statusMap: Record<string, string> = {
    open: "connected",
    close: "disconnected",
    connecting: "connecting",
    connected: "connected",
    disconnected: "disconnected",
  };

  const newStatus = connectionState ? (statusMap[connectionState.toLowerCase()] ?? "disconnected") : null;

  if (newStatus) {
    const admin = createAdminClient();
    await admin
      .from("wa_sessions")
      .update({ status: newStatus, last_seen_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ connectionState, newStatus, raw: instance });
}
