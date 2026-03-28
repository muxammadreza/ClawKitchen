"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { fetchJson } from "@/lib/fetch-json";
import { errorMessage } from "@/lib/errors";

type CronJob = {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  schedule?: {
    kind?: string;
    expr?: string;
    everyMs?: number;
    tz?: string;
  };
  delivery?: {
    mode?: string;
    channel?: string;
    to?: string;
    bestEffort?: boolean;
  };
  payload?: {
    kind?: string;
    text?: string;
    message?: string;
    model?: string;
    thinking?: string;
    timeoutSeconds?: number;
  };
  agentId?: string;
  sessionTarget?: string;
  sessionKey?: string;
};

interface EditCronJobModalProps {
  job: CronJob | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditCronJobModal({ job, open, onClose, onSaved }: EditCronJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [scheduleKind, setScheduleKind] = useState<"cron" | "every">("every");
  const [cronExpr, setCronExpr] = useState("");
  const [everyValue, setEveryValue] = useState(60);
  const [everyUnit, setEveryUnit] = useState<"s" | "m" | "h" | "d">("m");
  const [timezone, setTimezone] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"none" | "announce">("none");
  const [deliveryChannel, setDeliveryChannel] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");
  const [deliveryBestEffort, setDeliveryBestEffort] = useState(true);
  const [payloadKind, setPayloadKind] = useState<"systemEvent" | "agentTurn">("agentTurn");
  const [payloadText, setPayloadText] = useState("");
  const [payloadMessage, setPayloadMessage] = useState("");
  const [payloadModel, setPayloadModel] = useState("");
  const [payloadThinking, setPayloadThinking] = useState("");
  const [payloadTimeout, setPayloadTimeout] = useState(30);
  const [agentId, setAgentId] = useState("");
  const [sessionTarget, setSessionTarget] = useState("");
  const [sessionKey, setSessionKey] = useState("");

  // Initialize form when job changes
  useEffect(() => {
    if (!job) return;
    
    setName(job.name || "");
    setDescription(job.description || "");
    setEnabled(Boolean(job.enabled));
    
    if (job.schedule) {
      if (job.schedule.kind === "cron") {
        setScheduleKind("cron");
        setCronExpr(job.schedule.expr || "");
      } else if (job.schedule.kind === "every") {
        setScheduleKind("every");
        if (job.schedule.everyMs) {
          const ms = job.schedule.everyMs;
          if (ms >= 86400000) {
            setEveryValue(Math.round(ms / 86400000));
            setEveryUnit("d");
          } else if (ms >= 3600000) {
            setEveryValue(Math.round(ms / 3600000));
            setEveryUnit("h");
          } else if (ms >= 60000) {
            setEveryValue(Math.round(ms / 60000));
            setEveryUnit("m");
          } else {
            setEveryValue(Math.round(ms / 1000));
            setEveryUnit("s");
          }
        }
      }
      setTimezone(job.schedule.tz || "");
    }
    
    if (job.delivery) {
      setDeliveryMode(job.delivery.mode === "announce" ? "announce" : "none");
      setDeliveryChannel(job.delivery.channel || "");
      setDeliveryTo(job.delivery.to || "");
      setDeliveryBestEffort(Boolean(job.delivery.bestEffort));
    }
    
    if (job.payload) {
      setPayloadKind(job.payload.kind === "systemEvent" ? "systemEvent" : "agentTurn");
      setPayloadText(job.payload.text || "");
      setPayloadMessage(job.payload.message || "");
      setPayloadModel(job.payload.model || "");
      setPayloadThinking(job.payload.thinking || "");
      setPayloadTimeout(job.payload.timeoutSeconds || 30);
    }
    
    setAgentId(job.agentId || "");
    setSessionTarget(job.sessionTarget || "");
    setSessionKey(job.sessionKey || "");
  }, [job]);

  const handleSave = async () => {
    if (!job) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const everyMs = scheduleKind === "every" ? 
        everyValue * (everyUnit === "s" ? 1000 : everyUnit === "m" ? 60000 : everyUnit === "h" ? 3600000 : 86400000)
        : undefined;

      const payload = {
        id: job.id,
        name: name || undefined,
        description: description || undefined,
        enabled,
        schedule: {
          kind: scheduleKind,
          expr: scheduleKind === "cron" ? cronExpr : undefined,
          everyMs: scheduleKind === "every" ? everyMs : undefined,
          tz: timezone || undefined,
        },
        delivery: deliveryMode === "announce" ? {
          mode: "announce",
          channel: deliveryChannel || undefined,
          to: deliveryTo || undefined,
          bestEffort: deliveryBestEffort,
        } : {
          mode: "none",
        },
        payload: {
          kind: payloadKind,
          text: payloadKind === "systemEvent" ? payloadText : undefined,
          message: payloadKind === "agentTurn" ? payloadMessage : undefined,
          model: payloadKind === "agentTurn" ? payloadModel || undefined : undefined,
          thinking: payloadKind === "agentTurn" ? payloadThinking || undefined : undefined,
          timeoutSeconds: payloadKind === "agentTurn" ? payloadTimeout : undefined,
        },
        agentId: agentId || undefined,
        sessionTarget: sessionTarget || undefined,
        sessionKey: sessionKey || undefined,
      };

      const result = await fetchJson<{ ok: boolean; error?: string }>("/api/cron/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to save cron job");
      }

      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Cron Job: ${job.name || job.id}`}
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-[var(--ck-radius-sm)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
              placeholder="Optional job name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-white/20"
            />
            <label htmlFor="enabled" className="text-sm font-medium">
              Enabled
            </label>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Schedule</h3>
          
          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Schedule Type
            </label>
            <select
              value={scheduleKind}
              onChange={(e) => setScheduleKind(e.target.value as "cron" | "every")}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
            >
              <option value="every">Every (interval)</option>
              <option value="cron">Cron expression</option>
            </select>
          </div>

          {scheduleKind === "cron" ? (
            <div>
              <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                Cron Expression
              </label>
              <input
                type="text"
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                placeholder="0 * * * *"
              />
              <p className="mt-1 text-xs text-[color:var(--ck-text-secondary)]">
                5-field format (min hour day month dow)
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                  Every
                </label>
                <input
                  type="number"
                  min="1"
                  value={everyValue}
                  onChange={(e) => setEveryValue(parseInt(e.target.value) || 1)}
                  className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                  Unit
                </label>
                <select
                  value={everyUnit}
                  onChange={(e) => setEveryUnit(e.target.value as "s" | "m" | "h" | "d")}
                  className="rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                >
                  <option value="s">seconds</option>
                  <option value="m">minutes</option>
                  <option value="h">hours</option>
                  <option value="d">days</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Timezone (IANA)
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
              placeholder="UTC (default)"
            />
          </div>
        </div>

        {/* Payload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Payload</h3>
          
          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Payload Type
            </label>
            <select
              value={payloadKind}
              onChange={(e) => setPayloadKind(e.target.value as "systemEvent" | "agentTurn")}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
            >
              <option value="agentTurn">Agent Turn (isolated session)</option>
              <option value="systemEvent">System Event (main session)</option>
            </select>
          </div>

          {payloadKind === "systemEvent" ? (
            <div>
              <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                System Event Text
              </label>
              <textarea
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                rows={3}
                placeholder="Text to inject as system event"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                  Agent Message
                </label>
                <textarea
                  value={payloadMessage}
                  onChange={(e) => setPayloadMessage(e.target.value)}
                  className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Message to send to agent"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={payloadModel}
                    onChange={(e) => setPayloadModel(e.target.value)}
                    className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                    placeholder="Default model"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                    Thinking
                  </label>
                  <select
                    value={payloadThinking}
                    onChange={(e) => setPayloadThinking(e.target.value)}
                    className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                  >
                    <option value="">Default</option>
                    <option value="off">Off</option>
                    <option value="minimal">Minimal</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="xhigh">Extra High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  value={payloadTimeout}
                  onChange={(e) => setPayloadTimeout(parseInt(e.target.value) || 30)}
                  className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Agent & Session */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Agent & Session</h3>
          
          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Agent ID
            </label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
              placeholder="Default agent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Session Target
            </label>
            <select
              value={sessionTarget}
              onChange={(e) => setSessionTarget(e.target.value)}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              <option value="main">Main</option>
              <option value="isolated">Isolated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Session Key
            </label>
            <input
              type="text"
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
              placeholder="Optional session key"
            />
          </div>
        </div>

        {/* Delivery */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Delivery</h3>
          
          <div>
            <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
              Delivery Mode
            </label>
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value as "none" | "announce")}
              className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
            >
              <option value="none">None</option>
              <option value="announce">Announce to chat</option>
            </select>
          </div>

          {deliveryMode === "announce" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                  Channel
                </label>
                <input
                  type="text"
                  value={deliveryChannel}
                  onChange={(e) => setDeliveryChannel(e.target.value)}
                  className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                  placeholder="Last used channel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--ck-text-primary)] mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  value={deliveryTo}
                  onChange={(e) => setDeliveryTo(e.target.value)}
                  className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm"
                  placeholder="User or channel ID"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bestEffort"
                  checked={deliveryBestEffort}
                  onChange={(e) => setDeliveryBestEffort(e.target.checked)}
                  className="rounded border-white/20"
                />
                <label htmlFor="bestEffort" className="text-sm font-medium">
                  Best effort delivery (don&apos;t fail job if delivery fails)
                </label>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-[var(--ck-radius-sm)] bg-[var(--ck-accent-red)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--ck-accent-red-hover)] disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}