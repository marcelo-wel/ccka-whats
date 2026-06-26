"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AlertNotifier() {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("alert-notifier")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_events" },
        (payload) => {
          const ev = payload.new as { matched_keyword: string };
          toast("Alerta disparado", {
            description: `Palavra-chave detectada: "${ev.matched_keyword}"`,
            duration: 6000,
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return null;
}
