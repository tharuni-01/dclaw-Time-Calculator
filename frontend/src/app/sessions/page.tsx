"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listSessions, deleteSession, SessionResponse } from "@/lib/api";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listSessions();
      setSessions(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch {
      setError("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete session "${name}"?`)) return;
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1">
              ← Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Session History</h1>
            <p className="text-xs text-gray-500">All saved payroll calculations</p>
          </div>
        </div>
        <Link href="/">
          <Button size="sm">New Calculation</Button>
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading && <p className="text-gray-500 text-center py-12">Loading…</p>}
        {error && <p className="text-red-600 text-center py-12">{error}</p>}

        {!loading && !error && sessions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No saved sessions yet.{" "}
              <Link href="/" className="text-blue-600 underline">Start a calculation.</Link>
            </CardContent>
          </Card>
        )}

        {!loading && sessions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{sessions.length} Session{sessions.length !== 1 ? "s" : ""}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Entries</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{s.entry_count}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-semibold ${s.total.is_negative ? "text-red-600" : "text-green-700"}`}>
                          {s.total.formatted}
                        </span>
                        {s.total.is_negative && (
                          <Badge variant="destructive" className="ml-2 text-xs">negative</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        <Link href={`/?session=${s.id}`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(s.id, s.name)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
