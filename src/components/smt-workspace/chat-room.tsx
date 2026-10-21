"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/smt/smt-charts";
import { deleteOrRequest } from "@/components/smt-workspace/delete-request";
import type { ChatAttachment, ChatChannel, ChatMessage } from "@/lib/smt/chat-store";
import { ROLE_LABEL, type SmtRole } from "@/lib/smt/permissions";

// Nhóm chat của đội SMT. Lấy tin mới bằng cách hỏi server định kỳ khi tab đang mở (không cần dịch vụ realtime).
// Nhịp hỏi giãn dần 4s -> 30s khi kênh im lặng để 20 người mở cả ca không vượt hạn mức request miễn phí;
// có tin mới / đang gõ -> về 4s. Ảnh được nén trong trình duyệt trước khi tải lên.

type Props = { me: { id: string; name: string; role: SmtRole }; lines: string[]; defectCodes: string[]; staff: boolean };

const POLL_MIN_MS = 4000;
const POLL_MAX_MS = 30000;
const EDIT_WINDOW_MS = 15 * 60 * 1000;

async function call<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(data.message || "Thất bại.");
  return data;
}

// Thu nhỏ ảnh về cạnh dài ≤ 1600px, JPEG 0.82 (ảnh điện thoại 4-8 MB -> ~200-400 KB).
async function compress(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Không nén được ảnh."))), "image/jpeg", 0.82));
  return { blob, width: canvas.width, height: canvas.height };
}

const time = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

export function ChatRoom({ me, lines, defectCodes, staff }: Props) {
  const t = useT();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [issues, setIssues] = useState<ChatMessage[]>([]);
  const [active, setActive] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [isIssue, setIsIssue] = useState(false);
  const [line, setLine] = useState("");
  const [defect, setDefect] = useState("");
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasOlder, setHasOlder] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const stick = useRef(true);
  const pollMs = useRef(POLL_MIN_MS);
  const channel = channels.find((c) => c.id === active);

  const loadMeta = useCallback(async () => {
    const d = await call<{ channels: ChatChannel[]; issues: ChatMessage[] }>("/api/smt/chat");
    setChannels(d.channels);
    setIssues(d.issues);
    setActive((a) => a || d.channels[0]?.id || "");
  }, []);

  useEffect(() => {
    void loadMeta().catch((e: Error) => setError(e.message));
  }, [loadMeta]);

  // Đổi kênh: tải 80 tin gần nhất.
  useEffect(() => {
    if (!active || active === "issues") return;
    let alive = true;
    setMessages([]);
    setHasOlder(true);
    stick.current = true;
    call<{ items: ChatMessage[] }>(`/api/smt/chat?channel=${active}`)
      .then((d) => alive && (setMessages(d.items), setHasOlder(d.items.length >= 80)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [active]);

  // Hỏi tin mới định kỳ (dừng khi tab bị ẩn).
  useEffect(() => {
    if (!active || active === "issues") return;
    let timer = 0;
    const tick = async () => {
      if (!document.hidden) {
        const last = messages[messages.length - 1]?.created_at;
        try {
          const d = await call<{ items: ChatMessage[] }>(`/api/smt/chat?channel=${active}${last ? `&after=${encodeURIComponent(last)}` : ""}`);
          if (d.items.length) {
            pollMs.current = POLL_MIN_MS;
            setMessages((m) => [...m, ...d.items.filter((x) => !m.some((y) => y.id === x.id))]);
            return; // messages đổi -> effect chạy lại với nhịp mới
          }
          pollMs.current = Math.min(POLL_MAX_MS, pollMs.current * 1.5);
        } catch {
          // mạng chập chờn: thử lại lần sau
        }
      }
      timer = window.setTimeout(tick, pollMs.current);
    };
    timer = window.setTimeout(tick, pollMs.current);
    return () => window.clearTimeout(timer);
  }, [active, messages]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function older() {
    const first = messages[0]?.created_at;
    if (!first) return;
    const d = await call<{ items: ChatMessage[] }>(`/api/smt/chat?channel=${active}&before=${encodeURIComponent(new Date(new Date(first).getTime() - 1).toISOString())}`);
    stick.current = false;
    setHasOlder(d.items.length >= 80);
    setMessages((m) => [...d.items.filter((x) => !m.some((y) => y.id === x.id)), ...m]);
  }

  async function attach(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const f of [...list].slice(0, 6 - files.length)) {
        const { blob, width, height } = await compress(f);
        const form = new FormData();
        form.append("file", new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/smt/chat/upload", { method: "POST", body: form });
        const d = (await res.json()) as { url?: string; message?: string };
        if (!res.ok || !d.url) throw new Error(d.message || "Tải ảnh thất bại.");
        setFiles((x) => [...x, { url: d.url!, name: f.name, width, height }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải ảnh thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!body.trim() && !files.length) return;
    setBusy(true);
    setError("");
    try {
      const d = await call<{ item: ChatMessage }>("/api/smt/chat", { method: "POST", body: JSON.stringify({ channel_id: active, body, is_issue: isIssue, line: line || channel?.line, defect_code: isIssue ? defect : "", attachments: files, reply_to: replyTo?.id ?? null }) });
      stick.current = true;
      setMessages((m) => [...m, d.item]);
      setBody("");
      setFiles([]);
      setIsIssue(false);
      setDefect("");
      setReplyTo(null);
      if (isIssue) void loadMeta();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gửi thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(m: ChatMessage, data: Record<string, unknown>) {
    try {
      const d = await call<{ item: ChatMessage }>("/api/smt/chat", { method: "PATCH", body: JSON.stringify({ id: m.id, ...data }) });
      setMessages((list) => list.map((x) => (x.id === m.id ? d.item : x)));
      void loadMeta();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thất bại.");
    }
  }

  async function remove(m: ChatMessage) {
    if (!confirm(t("Xoá tin nhắn này?", "Delete this message?"))) return;
    try {
      const r = await deleteOrRequest(`/api/smt/chat?id=${m.id}`, { kind: "chat", ids: [m.id], label: `tin nhắn của ${m.author_name}`, demo: false });
      if (r === "deleted") setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, deleted_at: new Date().toISOString(), body: "", attachments: [] } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thất bại.");
    }
  }

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const chName = (id: string) => channels.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="grid gap-3 lg:grid-cols-[230px_1fr]">
      <aside className="card space-y-1 p-2 lg:max-h-[75vh] lg:overflow-y-auto" aria-label={t("Kênh", "Channels")}>
        <button type="button" onClick={() => setActive("issues")} aria-pressed={active === "issues"} className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-semibold ${active === "issues" ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}>
          ⚠️ {t("Vấn đề chưa xử lý", "Open issues")} <span className="tabular-nums">{issues.length}</span>
        </button>
        {channels.map((c) => (
          <button key={c.id} type="button" onClick={() => setActive(c.id)} aria-pressed={active === c.id} className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm ${active === c.id ? "bg-brand-600 font-semibold text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`} title={c.description}>
            {c.kind === "line" ? "🏭" : c.kind === "general" ? "📢" : "#"} {c.name}
          </button>
        ))}
        {staff && (
          <Link href="/smt/quan-tri#kenh" className="muted block px-2 pt-2 text-xs underline">
            {t("Quản lý kênh", "Manage channels")}
          </Link>
        )}
      </aside>

      {active === "issues" ? (
        <section className="card space-y-2">
          <h1 className="font-semibold">{t("Vấn đề chưa xử lý (mọi kênh)", "Open issues (all channels)")}</h1>
          {issues.map((m) => (
            <div key={m.id} className="rounded-lg border p-2 text-sm" style={{ borderColor: "var(--border)" }}>
              <p className="muted text-xs">
                #{chName(m.channel_id)} · {m.author_name} · {time(m.created_at)} {m.line && `· ${m.line}`} {m.defect_code && `· ${m.defect_code}`}
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <div className="mt-1 flex gap-3 text-xs">
                <button type="button" className="font-semibold text-brand-600 dark:text-brand-300" onClick={() => setActive(m.channel_id)}>
                  {t("Mở kênh", "Open channel")}
                </button>
                {staff && (
                  <Link href={`/smt/cong-viec?title=${encodeURIComponent(m.body.slice(0, 120))}&line=${m.line}`} className="font-semibold text-brand-600 dark:text-brand-300">
                    → {t("Tạo việc", "Create task")}
                  </Link>
                )}
              </div>
            </div>
          ))}
          {!issues.length && <p className="muted text-sm">{t("Không có vấn đề nào đang mở. 👍", "No open issues. 👍")}</p>}
        </section>
      ) : (
        <section className="card flex min-h-[60vh] flex-col gap-2 p-0">
          <header className="border-b px-4 py-2" style={{ borderColor: "var(--border)" }}>
            <h1 className="font-semibold">{channel?.name}</h1>
            {channel?.description && <p className="muted text-xs">{channel.description}</p>}
          </header>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-2 lg:max-h-[58vh]" onScroll={(e) => (stick.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 60)}>
            {hasOlder && messages.length > 0 && (
              <button type="button" className="muted mx-auto block text-xs underline" onClick={older}>
                {t("Xem tin cũ hơn", "Load older")}
              </button>
            )}
            {messages.map((m) => {
              const mine = m.author_id === me.id;
              const fresh = mine && Date.now() - new Date(m.created_at).getTime() < EDIT_WINDOW_MS;
              const parent = m.reply_to ? byId.get(m.reply_to) : null;
              return (
                <article key={m.id} className={`rounded-xl border p-2.5 text-sm ${m.is_issue && !m.resolved ? "border-l-4" : ""}`} style={{ borderColor: m.is_issue && !m.resolved ? "var(--status-critical)" : "var(--border)" }}>
                  <p className="muted flex flex-wrap items-center gap-x-2 text-xs">
                    <b className="text-[color:var(--text)]">{m.author_name}</b>
                    <span>{t(ROLE_LABEL[m.author_role as SmtRole]?.vi ?? "", ROLE_LABEL[m.author_role as SmtRole]?.en ?? "")}</span>
                    <span>{time(m.created_at)}</span>
                    {m.edited_at && <span>({t("đã sửa", "edited")})</span>}
                    {m.is_issue && <span className="font-semibold">{m.resolved ? `✓ ${t("Vấn đề đã xử lý", "Issue resolved")}` : `⚠ ${t("Vấn đề", "Issue")}`}</span>}
                    {m.line && <span>{m.line}</span>}
                    {m.defect_code && <span>{m.defect_code}</span>}
                  </p>
                  {parent && <p className="muted mt-1 truncate border-l-2 pl-2 text-xs" style={{ borderColor: "var(--border)" }}>↪ {parent.author_name}: {parent.body || "…"}</p>}
                  {m.deleted_at ? <p className="muted mt-1 italic">{t("Tin đã bị xoá", "Message deleted")}</p> : <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map((a) => (
                        <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt={a.name} loading="lazy" className="h-28 w-auto rounded-lg border object-cover" style={{ borderColor: "var(--border)" }} />
                        </a>
                      ))}
                    </div>
                  )}
                  {!m.deleted_at && (
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs font-semibold text-brand-600 dark:text-brand-300">
                      <button type="button" onClick={() => setReplyTo(m)}>
                        ↩ {t("Trả lời", "Reply")}
                      </button>
                      {m.is_issue && (mine || staff) && (
                        <button type="button" onClick={() => patch(m, { resolved: !m.resolved })}>
                          {m.resolved ? t("Mở lại vấn đề", "Reopen issue") : `✓ ${t("Đã xử lý", "Resolved")}`}
                        </button>
                      )}
                      {!m.is_issue && (mine || staff) && (
                        <button type="button" onClick={() => patch(m, { is_issue: true })}>
                          ⚠ {t("Đánh dấu vấn đề", "Mark as issue")}
                        </button>
                      )}
                      {staff && (
                        <Link href={`/smt/cong-viec?title=${encodeURIComponent(m.body.slice(0, 120))}&line=${m.line}`}>→ {t("Tạo việc", "Create task")}</Link>
                      )}
                      {fresh && (
                        <button
                          type="button"
                          onClick={() => {
                            const v = prompt(t("Sửa tin nhắn", "Edit message"), m.body);
                            if (v !== null && v.trim()) void patch(m, { body: v });
                          }}
                        >
                          ✎ {t("Sửa", "Edit")}
                        </button>
                      )}
                      {(fresh || staff) && (
                        <button type="button" className="text-red-600" onClick={() => remove(m)}>
                          🗑
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {!messages.length && <p className="muted py-8 text-center text-sm">{t("Chưa có tin nhắn. Bắt đầu trao đổi!", "No messages yet. Start the conversation!")}</p>}
          </div>

          <footer className="space-y-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
            {replyTo && (
              <p className="muted flex items-center justify-between gap-2 text-xs">
                <span className="truncate">↪ {replyTo.author_name}: {replyTo.body}</span>
                <button type="button" onClick={() => setReplyTo(null)} aria-label={t("Bỏ trả lời", "Cancel reply")}>
                  ✕
                </button>
              </p>
            )}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f) => (
                  <span key={f.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.name} className="h-16 w-auto rounded border" style={{ borderColor: "var(--border)" }} />
                    <button type="button" className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] text-white" onClick={() => setFiles((x) => x.filter((y) => y.url !== f.url))} aria-label={t("Bỏ ảnh", "Remove image")}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              className="input min-h-[64px]"
              placeholder={t("Nhập tin nhắn… (Enter gửi, Shift+Enter xuống dòng)", "Type a message… (Enter to send, Shift+Enter for newline)")}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                pollMs.current = POLL_MIN_MS;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              maxLength={4000}
              aria-label={t("Tin nhắn", "Message")}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="btn-ghost cursor-pointer">
                📷 {t("Ảnh", "Photo")}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => (void attach(e.target.files), (e.target.value = ""))} />
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={isIssue} onChange={(e) => setIsIssue(e.target.checked)} />⚠ {t("Đây là vấn đề cần theo dõi", "This is an issue to track")}
              </label>
              {isIssue && (
                <>
                  <select className="input w-auto" value={line} onChange={(e) => setLine(e.target.value)} aria-label="Line">
                    <option value="">{channel?.line || t("Line?", "Line?")}</option>
                    {lines.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <select className="input w-auto" value={defect} onChange={(e) => setDefect(e.target.value)} aria-label={t("Mã lỗi", "Defect code")}>
                    <option value="">{t("Mã lỗi?", "Defect?")}</option>
                    {defectCodes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button type="button" className="btn-primary ml-auto" onClick={send} disabled={busy || (!body.trim() && !files.length)}>
                {busy ? "…" : t("Gửi", "Send")}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </footer>
        </section>
      )}
    </div>
  );
}
