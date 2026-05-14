"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createSession, addEntry, deleteEntry, renameSession,
  getSession, SessionTotal, TimeEntryCreate,
} from "@/lib/api";

interface LocalEntry {
  id: string;
  serverId?: string;
  label: string;
  hours: number;
  minutes: number;
  seconds: number;
  operation: "add" | "subtract";
}

let __entryIdCounter = 0;
function newEntryId(): string {
  return `e${++__entryIdCounter}`;
}

function emptyEntry(): LocalEntry {
  return { id: newEntryId(), label: "", hours: 0, minutes: 0, seconds: 0, operation: "add" };
}

function computeTotal(entries: LocalEntry[]): SessionTotal {
  let totalSeconds = 0;
  for (const e of entries) {
    const secs = e.hours * 3600 + e.minutes * 60 + e.seconds;
    totalSeconds += e.operation === "add" ? secs : -secs;
  }
  const isNeg = totalSeconds < 0;
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const fmt = (n: number) => String(n).padStart(2, "0");
  return {
    total_seconds: totalSeconds,
    is_negative: isNeg,
    hours: h, minutes: m, seconds: s,
    formatted: `${isNeg ? "-" : ""}${fmt(h)}:${fmt(m)}:${fmt(s)}`,
  };
}

export default function Calculator({ sessionId }: { sessionId?: string }) {
  const [entries, setEntries] = useState<LocalEntry[]>([emptyEntry()]);
  const [sessionName, setSessionName] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);
  const [originalEntryIds, setOriginalEntryIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((session) => {
      setCurrentSessionId(session.id);
      setSessionName(session.name);
      const loaded = session.entries.map((e) => ({
        id: newEntryId(),
        serverId: e.id,
        label: e.label,
        hours: e.hours,
        minutes: e.minutes,
        seconds: e.seconds,
        operation: e.operation as "add" | "subtract",
      }));
      setEntries(loaded.length ? loaded : [emptyEntry()]);
      setOriginalEntryIds(session.entries.map((e) => e.id));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [sessionId]);

  const total = computeTotal(entries);
  const isEditMode = !!currentSessionId;

  const updateEntry = (id: string, field: keyof LocalEntry, value: string | number) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

  const addRow = () => setEntries((prev) => [...prev, emptyEntry()]);

  const removeRow = (id: string) =>
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));

  const clearAll = () => {
    setEntries([emptyEntry()]);
    setSessionName("");
    setCurrentSessionId(undefined);
    setOriginalEntryIds([]);
    setStatusMsg("");
    window.history.replaceState({}, "", "/");
  };

  const clampNum = (val: string, max: number) =>
    Math.min(Math.max(parseInt(val) || 0, 0), max);

  const saveNew = async () => {
    if (!sessionName.trim()) return;
    setSaving(true);
    setStatusMsg("");
    try {
      const session = await createSession(sessionName.trim());
      for (const e of entries) {
        if (e.hours || e.minutes || e.seconds) {
          await addEntry(session.id, toEntryCreate(e));
        }
      }
      setCurrentSessionId(session.id);
      setStatusMsg(`Saved as "${session.name}"`);
      setSessionName("");
      window.history.replaceState({}, "", `/?session=${session.id}`);
    } catch {
      setStatusMsg("Error saving session.");
    } finally {
      setSaving(false);
    }
  };

  const saveUpdate = async () => {
    if (!currentSessionId || !sessionName.trim()) return;
    setSaving(true);
    setStatusMsg("");
    try {
      // Delete all original server-side entries
      for (const eid of originalEntryIds) {
        await deleteEntry(currentSessionId, eid);
      }
      // Re-add all current entries
      for (const e of entries) {
        if (e.hours || e.minutes || e.seconds) {
          await addEntry(currentSessionId, toEntryCreate(e));
        }
      }
      // Rename if needed
      const fresh = await getSession(currentSessionId);
      if (sessionName.trim() !== fresh.name) {
        await renameSession(currentSessionId, sessionName.trim());
      }
      const newIds = (await getSession(currentSessionId)).entries.map((e) => e.id);
      setOriginalEntryIds(newIds);
      setStatusMsg("Session updated!");
    } catch {
      setStatusMsg("Error updating session.");
    } finally {
      setSaving(false);
    }
  };

  const toEntryCreate = (e: LocalEntry): TimeEntryCreate => ({
    label: e.label,
    hours: e.hours,
    minutes: e.minutes,
    seconds: e.seconds,
    operation: e.operation,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading session…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEditMode ? `Editing: ${sessionName || "Session"}` : "Time Calculator"}
          </h1>
          <p className="text-xs text-gray-500">Payroll time addition &amp; subtraction</p>
        </div>
        <div className="flex gap-2">
          {isEditMode && (
            <Button variant="outline" size="sm" onClick={clearAll}>
              New Calculation
            </Button>
          )}
          <Link href="/sessions">
            <Button variant="outline" size="sm">View History</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Total display */}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-500 mb-1">Total Time</p>
            <p className={`text-5xl font-mono font-bold ${total.is_negative ? "text-red-600" : "text-green-700"}`}>
              {total.formatted}
            </p>
            {total.is_negative && (
              <Badge variant="destructive" className="mt-2">Negative — more subtracted than added</Badge>
            )}
          </CardContent>
        </Card>

        {/* Entries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Time Entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[1fr_56px_56px_56px_100px_36px] gap-2 text-xs text-gray-500 font-medium px-1">
              <span>Label</span>
              <span className="text-center">HH</span>
              <span className="text-center">MM</span>
              <span className="text-center">SS</span>
              <span className="text-center">Operation</span>
              <span />
            </div>

            {entries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_56px_56px_56px_100px_36px] gap-2 items-center">
                <Input
                  placeholder="e.g. Monday"
                  value={entry.label}
                  onChange={(e) => updateEntry(entry.id, "label", e.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  type="number" min={0}
                  value={entry.hours}
                  onChange={(e) => updateEntry(entry.id, "hours", clampNum(e.target.value, 999))}
                  className="h-9 text-sm text-center"
                />
                <Input
                  type="number" min={0} max={59}
                  value={entry.minutes}
                  onChange={(e) => updateEntry(entry.id, "minutes", clampNum(e.target.value, 59))}
                  className="h-9 text-sm text-center"
                />
                <Input
                  type="number" min={0} max={59}
                  value={entry.seconds}
                  onChange={(e) => updateEntry(entry.id, "seconds", clampNum(e.target.value, 59))}
                  className="h-9 text-sm text-center"
                />
                <Select
                  value={entry.operation}
                  onChange={(e) => updateEntry(entry.id, "operation", e.target.value as "add" | "subtract")}
                  className="h-9 text-sm"
                >
                  <option value="add">+ Add</option>
                  <option value="subtract">− Subtract</option>
                </Select>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => removeRow(entry.id)}
                  className="h-9 w-9 text-gray-400 hover:text-red-500"
                >
                  ×
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addRow} className="mt-2">
              + Add Row
            </Button>
          </CardContent>
        </Card>

        {/* Save / Update */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isEditMode ? "Update Session" : "Save to History"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="session-name" className="text-sm mb-1 block">Session name</Label>
                <Input
                  id="session-name"
                  placeholder="e.g. Week of May 13"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (isEditMode ? saveUpdate() : saveNew())}
                />
              </div>
              <Button
                onClick={isEditMode ? saveUpdate : saveNew}
                disabled={saving || !sessionName.trim()}
              >
                {saving ? "Saving…" : isEditMode ? "Update Session" : "Save Session"}
              </Button>
              <Button variant="outline" onClick={clearAll}>Clear</Button>
            </div>
            {statusMsg && (
              <p className={`mt-2 text-sm ${statusMsg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>
                {statusMsg}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
