"use client";

import { useEffect, useState } from "react";

interface AlertEvent {
  id: string;
  matched_keyword: string;
  seen: boolean;
  created_at: string;
  alert_id: string;
  alerts: { name: string } | null;
  messages: { body: string | null; type: string; timestamp: string | null } | null;
}

interface Props {
  initialEvents: AlertEvent[];
  total: number;
}

const PAGE_SIZE = 20;

export default function AlertHistoryClient({ initialEvents, total }: Props) {
  const [events, setEvents] = useState<AlertEvent[]>(initialEvents);
  const [offset, setOffset] = useState(initialEvents.length);
  const [loading, setLoading] = useState(false);
  const hasMore = events.length < total;

  // Mark all as seen on mount
  useEffect(() => {
    void fetch("/api/alert-events", { method: "PATCH" });
  }, []);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch(`/api/alert-events?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) return;
      const json = await res.json() as { data: AlertEvent[]; total: number };
      setEvents((prev) => [...prev, ...json.data]);
      setOffset((prev) => prev + json.data.length);
    } finally {
      setLoading(false);
    }
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">Nenhum evento registrado ainda.</p>
    );
  }

  return (
    <div className="space-y-2 max-w-2xl">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-gray-400">
              Alerta:{" "}
              <span className="text-white font-medium">{event.alerts?.name ?? event.alert_id}</span>
            </span>
            <span className="text-xs text-gray-500">
              {new Date(event.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-yellow-800/50 text-yellow-300 rounded px-2 py-0.5">
              {event.matched_keyword}
            </span>
            {event.messages?.body && (
              <span className="text-xs text-gray-400 truncate max-w-sm">
                {event.messages.body}
              </span>
            )}
          </div>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => void loadMore()}
          disabled={loading}
          className="w-full py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Carregando..." : `Carregar mais (${total - events.length} restantes)`}
        </button>
      )}
    </div>
  );
}
