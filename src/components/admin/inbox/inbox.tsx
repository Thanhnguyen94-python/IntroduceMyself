"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChatConversation } from "@/lib/chat/chat-store";
import type { DocComment } from "@/lib/chat/comments-store";

type Conversation = Omit<ChatConversation, "access_token">;
type Message = { id: string; sender: "visitor" | "admin"; body: string; createdAt: string };
type AdminComment = DocComment & { parent: DocComment | null; adminReplies: DocComment[] };

function ago(iso: string) {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "vừa xong";
  if (sec < 3600) return `${Math.floor(sec / 60)} phút`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

const QUICK_REPLIES = [
  "Cảm ơn bạn đã nhắn! Mình xem và trả lời bạn sớm nhé.",
  "Bạn chụp giúp mình ảnh đấu dây / ảnh màn hình báo lỗi được không?",
  "Bạn thử giữ nút BOOT, nhấn RESET, thả BOOT rồi nạp lại giúp mình nhé."
];

export function Inbox() {
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab") === "comments" ? "comments" : "chat";
  const [counts, setCounts] = useState({ unreadChats: 0, pendingComments: 0 });

  const loadCounts = useCallback(() => {
    fetch("/api/admin/chat?count=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { unreadChats?: number; pendingComments?: number }) => setCounts({ unreadChats: d.unreadChats ?? 0, pendingComments: d.pendingComments ?? 0 }))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadCounts();
    const t = window.setInterval(loadCounts, 15_000);
    return () => window.clearInterval(t);
  }, [loadCounts]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Hộp thư</h1>
        <nav className="flex gap-1 rounded-xl border p-1" style={{ borderColor: "var(--border)" }}>
          {[
            { id: "chat", label: "💬 Chat", badge: counts.unreadChats },
            { id: "comments", label: "❓ Hỏi đáp tài liệu", badge: counts.pendingComments }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => router.replace(`/admin/inbox${t.id === "comments" ? "?tab=comments" : ""}`)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.id ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
            >
              {t.label}
              {t.badge > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{t.badge}</span>}
            </button>
          ))}
        </nav>
      </div>
      {tab === "chat" ? <ChatInbox initialId={search.get("c")} onChange={loadCounts} /> : <CommentsInbox onChange={loadCounts} />}
    </section>
  );
}

function ChatInbox({ initialId, onChange }: { initialId: string | null; onChange: () => void }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(initialId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastAt = useRef<string | undefined>(undefined);

  const loadList = useCallback(() => {
    fetch("/api/admin/chat", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: Conversation[]; message?: string }) => {
        setItems(d.items ?? []);
        if (d.message) setError(d.message);
      })
      .catch(() => undefined);
  }, []);

  const loadThread = useCallback(
    async (full: boolean) => {
      if (!selected) return;
      const qs = !full && lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
      const d = (await fetch(`/api/admin/chat/${selected}${qs}`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null)) as { conversation?: Conversation; messages?: Message[] } | null;
      if (!d?.conversation) return;
      setConversation(d.conversation);
      const incoming = d.messages ?? [];
      if (incoming.length) lastAt.current = incoming[incoming.length - 1].createdAt;
      setMessages((prev) => {
        if (full) return incoming;
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...incoming.filter((m) => !ids.has(m.id))];
      });
      if (full || incoming.some((m) => m.sender === "visitor")) {
        onChange();
        loadList();
      }
    },
    [selected, onChange, loadList]
  );

  useEffect(() => {
    loadList();
    const t = window.setInterval(loadList, 10_000);
    return () => window.clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    lastAt.current = undefined;
    setMessages([]);
    if (!selected) return;
    loadThread(true);
    const t = window.setInterval(() => loadThread(false), 5000);
    return () => window.clearInterval(t);
  }, [selected, loadThread]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = reply.trim();
    if (!text || !selected) return;
    setSending(true);
    const res = await fetch(`/api/admin/chat/${selected}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
    setSending(false);
    if (!res.ok) {
      setError("Không gửi được trả lời.");
      return;
    }
    setReply("");
    await loadThread(false);
  }

  async function setStatus(status: "open" | "closed") {
    if (!selected) return;
    await fetch(`/api/admin/chat/${selected}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    loadList();
    loadThread(true);
  }

  async function remove() {
    if (!selected || !window.confirm("Xoá vĩnh viễn cuộc trò chuyện này?")) return;
    await fetch(`/api/admin/chat/${selected}`, { method: "DELETE" });
    setSelected(null);
    setConversation(null);
    loadList();
    onChange();
  }

  const visible = items.filter((c) => filter === "all" || c.status === filter);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="card h-fit max-h-[75vh] space-y-2 overflow-y-auto p-2">
        <div className="flex gap-1 p-1 text-xs">
          {(["open", "closed", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-2.5 py-1 ${filter === f ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}>
              {f === "open" ? "Đang mở" : f === "closed" ? "Đã xong" : "Tất cả"}
            </button>
          ))}
        </div>
        {error && <p className="px-2 text-xs text-red-600">{error}</p>}
        {visible.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`w-full rounded-xl px-3 py-2.5 text-left transition ${selected === c.id ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">
                {c.unread_admin > 0 && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-red-500" />}
                {c.name}
              </span>
              <span className={`shrink-0 text-[11px] ${selected === c.id ? "text-white/80" : "muted"}`}>{ago(c.last_message_at)}</span>
            </span>
            <span className={`block truncate text-xs ${selected === c.id ? "text-white/85" : "muted"}`}>{c.last_message_preview}</span>
            <span className={`block truncate text-[11px] ${selected === c.id ? "text-white/70" : "muted"}`}>
              {c.hub === "shop" ? "Cửa hàng" : c.hub ? `Hub /${c.hub}` : "Portfolio"} · {c.page}
            </span>
          </button>
        ))}
        {!visible.length && <p className="muted p-3 text-sm">Không có cuộc trò chuyện nào.</p>}
      </aside>

      {selected && conversation ? (
        <div className="card flex h-[75vh] flex-col p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="min-w-0 text-sm">
              <p className="text-base font-bold">{conversation.name}</p>
              <p className="muted text-xs">
                {conversation.contact ? (
                  <>
                    Liên hệ: <span className="select-all font-medium text-[color:var(--text)]">{conversation.contact}</span>
                  </>
                ) : (
                  "Không để lại liên hệ"
                )}
                {" · "}
                {conversation.country ?? "?"} · {conversation.device}
              </p>
              <p className="muted text-xs">
                Bắt đầu từ trang{" "}
                <a href={conversation.page ?? "/"} target="_blank" rel="noreferrer" className="underline">
                  {conversation.page}
                </a>{" "}
                · {new Date(conversation.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="flex gap-2">
              {conversation.status === "open" ? (
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setStatus("closed")}>
                  ✓ Đánh dấu xong
                </button>
              ) : (
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setStatus("open")}>
                  ↺ Mở lại
                </button>
              )}
              <button className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600" onClick={remove}>
                Xoá
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm ${m.sender === "admin" ? "rounded-tr-md bg-brand-600 text-white" : "rounded-tl-md"}`}
                  style={m.sender === "visitor" ? { background: "color-mix(in srgb, var(--border) 45%, transparent)" } : undefined}
                >
                  {m.body}
                  <span className={`mt-1 block text-[10px] ${m.sender === "admin" ? "text-white/70" : "muted"}`}>{new Date(m.createdAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-wrap gap-1">
              {QUICK_REPLIES.map((q) => (
                <button key={q} type="button" onClick={() => setReply(q)} className="chip max-w-full truncate px-2.5 text-[11px] hover:border-brand-400">
                  {q}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
                }}
                rows={3}
                placeholder="Trả lời... (Ctrl+Enter để gửi)"
                className="input flex-1 resize-y"
              />
              <button className="btn-primary h-10" disabled={sending || !reply.trim()} onClick={send}>
                {sending ? "..." : "Gửi"}
              </button>
            </div>
            <p className="muted text-[11px]">
              Khách thấy trả lời trong khung chat{conversation.contact?.includes("@") ? " và nhận email báo (nếu đã cấu hình RESEND_API_KEY)" : ""}.
            </p>
          </div>
        </div>
      ) : (
        <div className="card muted grid h-[40vh] place-items-center text-sm">Chọn một cuộc trò chuyện bên trái.</div>
      )}
    </div>
  );
}

function CommentsInbox({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<"pending" | "approved" | "hidden">("pending");
  const [items, setItems] = useState<AdminComment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/comments?status=${status}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: AdminComment[] }) => setItems(d.items ?? []))
      .catch(() => undefined);
  }, [status]);

  useEffect(() => load(), [load]);

  async function act(id: string, run: () => Promise<Response>) {
    setBusy(id);
    await run().catch(() => undefined);
    setBusy(null);
    load();
    onChange();
  }

  const patch = (id: string, next: string) =>
    act(id, () => fetch("/api/admin/comments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: next }) }));

  return (
    <div className="space-y-3">
      <div className="flex gap-1 text-sm">
        {(["pending", "approved", "hidden"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-lg px-3 py-1.5 ${status === s ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "border"}`} style={status === s ? undefined : { borderColor: "var(--border)" }}>
            {s === "pending" ? "Chờ duyệt" : s === "approved" ? "Đang hiển thị" : "Đã ẩn"}
          </button>
        ))}
      </div>

      {items.map((c) => (
        <article key={c.id} className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
            <div>
              <p>
                <b>{c.author_name}</b>
                {c.is_admin && <span className="chip ml-1 text-[10px]">Bạn</span>}
                <span className="muted text-xs"> · {new Date(c.created_at).toLocaleString("vi-VN")}</span>
              </p>
              <p className="muted text-xs">
                Trên{" "}
                <a href={`${c.doc_path}#hoi-dap`} target="_blank" rel="noreferrer" className="underline">
                  {c.doc_path}
                </a>
                {c.contact && (
                  <>
                    {" · "}Liên hệ: <span className="select-all">{c.contact}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-1">
              {c.status !== "approved" && (
                <button disabled={busy === c.id} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white" onClick={() => patch(c.id, "approved")}>
                  ✓ Duyệt
                </button>
              )}
              {c.status !== "hidden" && (
                <button disabled={busy === c.id} className="btn-ghost px-3 py-1 text-xs" onClick={() => patch(c.id, "hidden")}>
                  Ẩn
                </button>
              )}
              <button
                disabled={busy === c.id}
                className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600"
                onClick={() => window.confirm("Xoá vĩnh viễn?") && act(c.id, () => fetch(`/api/admin/comments?id=${c.id}`, { method: "DELETE" }))}
              >
                Xoá
              </button>
            </div>
          </div>
          {c.parent && (
            <p className="muted rounded-lg border-l-4 px-3 py-1 text-xs" style={{ borderColor: "var(--border)" }}>
              Hỏi thêm cho: “{c.parent.body.slice(0, 160)}”
            </p>
          )}
          <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
          {c.adminReplies.map((r) => (
            <p key={r.id} className="ml-6 whitespace-pre-wrap rounded-xl bg-brand-500/10 px-3 py-2 text-sm">
              <b>Bạn đã trả lời:</b> {r.body}
            </p>
          ))}
          {!c.is_admin && (
            <div className="flex items-end gap-2">
              <textarea
                value={drafts[c.id] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [c.id]: e.target.value })}
                rows={2}
                placeholder="Trả lời công khai (câu hỏi sẽ được duyệt cùng lúc)..."
                className="input flex-1 resize-y"
              />
              <button
                className="btn-primary"
                disabled={busy === c.id || !(drafts[c.id] ?? "").trim()}
                onClick={() =>
                  act(c.id, async () => {
                    const res = await fetch("/api/admin/comments", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ parentId: c.id, body: drafts[c.id] })
                    });
                    if (res.ok) setDrafts((d) => ({ ...d, [c.id]: "" }));
                    return res;
                  })
                }
              >
                Trả lời & duyệt
              </button>
            </div>
          )}
        </article>
      ))}
      {!items.length && <p className="card muted text-sm">Không có câu hỏi nào ở mục này.</p>}
    </div>
  );
}
