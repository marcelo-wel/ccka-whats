"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AlertBadge() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { count: c } = await supabase
        .from("alert_events")
        .select("*", { count: "exact", head: true })
        .eq("seen", false);
      setCount(c ?? 0);
    }

    void refresh();

    const channel = supabase
      .channel("sidebar-alert-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "alert_events" }, () => {
        void refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (count === 0) return null;

  return (
    <span
      className="ml-auto bg-yellow-500 text-black text-xs font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center"
      aria-label={`${count} alerta${count !== 1 ? "s" : ""} não lido${count !== 1 ? "s" : ""}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
