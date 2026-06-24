"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError("Erro ao enviar email. Tente novamente.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">Recuperar senha</h1>
          <p className="text-sm text-gray-400">
            Enviaremos um link para redefinir sua senha
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-800 rounded-md px-4 py-3 text-sm text-green-300">
              Email enviado! Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </div>
            <Link
              href="/login"
              className="block text-center text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
            >
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
