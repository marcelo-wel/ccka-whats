import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: operator } = await supabase
    .from("operators")
    .select("role")
    .eq("id", user.id)
    .single();

  if (operator?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const { data: session } = await supabase
    .from("wa_sessions")
    .select("evolution_instance_name")
    .eq("id", id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Remover instância do Evolution API (best-effort — não falha se já não existir)
  if (session.evolution_instance_name) {
    await fetch(
      `${env.EVOLUTION_API_URL}/instance/delete/${session.evolution_instance_name}`,
      {
        method: "DELETE",
        headers: { "apikey": env.EVOLUTION_API_KEY },
      },
    ).catch(() => {});
  }

  // Deletar do banco (cascade remove chats, messages, media_files via FK)
  const admin = createAdminClient();
  const { error } = await admin
    .from("wa_sessions")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
