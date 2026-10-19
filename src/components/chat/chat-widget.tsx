"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { getVisitorId, readStoredJson, writeStoredJson } from "@/lib/visitor-id";
import { normalizeSiteData } from "@/lib/content/normalizers";
import type { SiteData } from "@/lib/content/types";

type Message = { id: string; sender: "visitor" | "admin"; body: string; createdAt: string; pending?: boolean };
type Session = { c: string; t: string; name: string };

const STORAGE_KEY = "mj_chat";
const OPEN_POLL_MS = 4000;
const CLOSED_POLL_MS = 45_000;

const SUGGESTIONS = {
  portfolio: {
    vi: ["Tôi muốn trao đổi cơ hội công việc", "Hỏi về một dự án của bạn", "Tư vấn cải tiến dây chuyền SMT"],
    en: ["I'd like to discuss a job opportunity", "Question about one of your projects", "SMT line improvement advice"]
  },
  hub: {
    vi: ["Không nạp được firmware", "Robot không nghe / không nói", "Hỏi về đấu dây, linh kiện"],
    en: ["Firmware flashing fails", "Robot doesn't hear / speak", "Question about wiring or parts"]
  },
  shop: {
    vi: ["Tư vấn chọn sản phẩm", "Phí ship về chỗ mình bao nhiêu?", "Đặt làm theo bản vẽ riêng"],
    en: ["Help me choose a product", "How much is shipping?", "Custom build from my drawing"]
  }
};

// Mở box chat từ nơi khác trên trang (vd nút "Hỏi về sản phẩm này"), có thể điền sẵn câu hỏi.
export const CHAT_OPEN_EVENT = "mj-chat:open";
export function openChat(message?: string) {
  window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT, { detail: { message } }));
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString("vi-VN", sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Box chat với admin: thu gọn / mở / phóng to. variant "portfolio" kèm nút liên hệ nhanh (thay FloatingContact cũ).
export function ChatWidget({ variant, hub }: { variant: "portfolio" | "hub" | "shop"; hub?: string }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [closedByAdmin, setClosedByAdmin] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [draft, setDraft] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [site, setSite] = useState<SiteData | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastAt = useRef<string | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Khung đang đóng: không cho Tab vào các ô bên trong.
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      if (message) setDraft(message);
      setOpen(true);
    };
    window.addEventListener(CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const saved = readStoredJson<Session>(STORAGE_KEY);
    if (saved?.c && saved.t) setSession(saved);
    const savedName = readStoredJson<{ name?: string; contact?: string }>(`${STORAGE_KEY}_profile`);
    if (savedName?.name) setName(savedName.name);
    if (savedName?.contact) setContact(savedName.contact);
  }, []);

  // Portfolio: lấy email / quyền hiển thị SĐT để làm nút liên hệ nhanh.
  useEffect(() => {
    if (variant !== "portfolio") return;
    fetch("/api/site", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: SiteData | null) => payload?.profile && setSite(normalizeSiteData(payload)))
      .catch(() => undefined);
  }, [variant]);

  const resetSession = useCallback(() => {
    writeStoredJson(STORAGE_KEY, null);
    setSession(null);
    setMessages([]);
    setClosedByAdmin(false);
    lastAt.current = undefined;
  }, []);

  const fetchMessages = useCallback(
    async (full = false) => {
      if (!session) return;
      const params = new URLSearchParams({ c: session.c, t: session.t });
      if (!full && lastAt.current) params.set("after", lastAt.current);
      const res = await fetch(`/api/chat?${params}`, { cache: "no-store" }).catch(() => null);
      if (!res) return;
      if (res.status === 404) {
        resetSession();
        return;
      }
      const data = (await res.json().catch(() => null)) as { messages?: Message[]; status?: string } | null;
      if (!data?.messages) return;
      setClosedByAdmin(data.status === "closed");
      if (data.messages.length) {
        lastAt.current = data.messages[data.messages.length - 1].createdAt;
        setMessages((prev) => {
          const base = full ? [] : prev.filter((m) => !m.pending);
          const ids = new Set(base.map((m) => m.id));
          return [...base, ...data.messages!.filter((m) => !ids.has(m.id))];
        });
      }
      setUnread(0);
    },
    [session, resetSession]
  );

  // Mở khung: tải toàn bộ rồi hỏi tin mới mỗi 4 giây. Thu gọn: chỉ hỏi số tin chưa đọc mỗi 45 giây.
  useEffect(() => {
    if (!session) return;
    if (open) {
      fetchMessages(true);
      const timer = window.setInterval(() => document.visibilityState === "visible" && fetchMessages(), OPEN_POLL_MS);
      return () => window.clearInterval(timer);
    }
    const peek = () =>
      fetch(`/api/chat?${new URLSearchParams({ c: session.c, t: session.t, peek: "1" })}`, { cache: "no-store" })
        .then((r) => (r.status === 404 ? (resetSession(), null) : r.json()))
        .then((d: { unread?: number } | null) => d && setUnread(d.unread ?? 0))
        .catch(() => undefined);
    peek();
    const timer = window.setInterval(() => document.visibilityState === "visible" && peek(), CLOSED_POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, session, fetchMessages, resetSession]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, session]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!session && !name.trim()) {
      setError(vi ? "Bạn cho Jay biết tên nhé." : "Please tell me your name.");
      return;
    }
    setError("");
    setSending(true);
    const temp: Message = { id: `tmp-${Date.now()}`, sender: "visitor", body: text, createdAt: new Date().toISOString(), pending: true };
    setMessages((prev) => [...prev, temp]);
    setDraft("");

    const payload = session
      ? { c: session.c, t: session.t, message: text }
      : { name: name.trim(), contact: contact.trim(), message: text, page: pathname, hub, visitorId: getVisitorId().id, website: honeypot };
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { conversationId?: string; token?: string; message?: Message | string } | null;
    setSending(false);

    if (!res?.ok || !data) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setDraft(text);
      setError(typeof data?.message === "string" ? data.message : vi ? "Không gửi được, thử lại sau nhé." : "Couldn't send, please try again.");
      return;
    }
    if (data.conversationId && data.token) {
      const next = { c: data.conversationId, t: data.token, name: name.trim() };
      writeStoredJson(STORAGE_KEY, next);
      writeStoredJson(`${STORAGE_KEY}_profile`, { name: name.trim(), contact: contact.trim() });
      setSession(next);
    }
    if (data.message && typeof data.message === "object") {
      const saved = data.message;
      lastAt.current = saved.createdAt;
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? saved : m)));
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  const suggestions = SUGGESTIONS[variant][lang];
  const showPhone = Boolean(site?.privacy?.showPhone);

  const panelSize = maximized
    ? "sm:bottom-6 sm:right-6 sm:h-[min(820px,calc(100vh-3rem))] sm:w-[min(760px,calc(100vw-3rem))]"
    : "sm:bottom-6 sm:right-6 sm:h-[min(560px,calc(100vh-3rem))] sm:w-[380px]";

  return (
    <>
      {/* Khung chat */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={vi ? "Chat với Mr Jay" : "Chat with Mr Jay"}
        aria-hidden={!open}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={`fixed inset-0 z-[60] flex flex-col overflow-hidden border shadow-2xl transition-all duration-300 sm:inset-auto sm:rounded-3xl ${panelSize} ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <header className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-3 text-white">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-bold">MJ</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Mr Jay</p>
            <p className="flex items-center gap-1.5 text-xs text-white/85">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {variant === "hub"
                ? vi
                  ? "Hỗ trợ lắp ráp & nạp firmware"
                  : "Build & firmware support"
                : variant === "shop"
                  ? vi
                    ? "Tư vấn sản phẩm & đơn hàng"
                    : "Product & order support"
                  : vi
                    ? "Thường trả lời trong vài giờ"
                    : "Usually replies within hours"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMaximized((v) => !v)}
            className="hidden h-8 w-8 place-items-center rounded-lg hover:bg-white/15 sm:grid"
            aria-label={maximized ? (vi ? "Thu nhỏ khung chat" : "Restore") : vi ? "Phóng to khung chat" : "Maximize"}
            title={maximized ? (vi ? "Thu nhỏ" : "Restore") : vi ? "Phóng to" : "Maximize"}
          >
            {maximized ? "⤡" : "⤢"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" aria-label={vi ? "Thu gọn" : "Minimize"} title={vi ? "Thu gọn" : "Minimize"}>
            —
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <div className="max-w-[85%] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm" style={{ background: "color-mix(in srgb, var(--border) 45%, transparent)" }}>
            {variant === "hub"
              ? vi
                ? "Chào bạn 👋 Gặp khó khi lắp hoặc nạp firmware? Mô tả lỗi (kèm ảnh/link nếu có), Jay sẽ trả lời sớm nhất."
                : "Hi 👋 Stuck building or flashing? Describe the problem and I'll reply as soon as I can."
              : variant === "shop"
                ? vi
                  ? "Chào bạn 👋 Cần tư vấn sản phẩm, báo giá số lượng hay làm theo yêu cầu? Nhắn ở đây nhé, nhớ để lại SĐT/Zalo để shop gọi lại."
                  : "Hi 👋 Need product advice, a bulk quote or a custom build? Leave your phone/Zalo so I can call back."
              : vi
                ? "Chào bạn 👋 Mình là Jay. Bạn cần trao đổi gì cứ nhắn, mình sẽ trả lời sớm nhất."
                : "Hi 👋 I'm Jay. Leave a message and I'll get back to you soon."}
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.sender === "visitor" ? "rounded-tr-md bg-brand-600 text-white" : "rounded-tl-md"
                } ${m.pending ? "opacity-60" : ""}`}
                style={m.sender === "admin" ? { background: "color-mix(in srgb, var(--border) 45%, transparent)" } : undefined}
              >
                {m.body}
                <span className={`mt-1 block text-[10px] ${m.sender === "visitor" ? "text-white/70" : "muted"}`}>
                  {m.pending ? (vi ? "Đang gửi..." : "Sending...") : timeLabel(m.createdAt)}
                </span>
              </div>
            </div>
          ))}

          {!session && !messages.length && (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => setDraft(s)} className="chip px-3 py-1 text-xs hover:border-brand-400">
                  {s}
                </button>
              ))}
            </div>
          )}

          {session && messages.length > 0 && messages.every((m) => m.sender === "visitor") && (
            <p className="muted text-center text-xs">
              {vi ? "Đã gửi ✓ Jay sẽ trả lời ở đây" : "Sent ✓ Replies will appear here"}
              {contact && isEmailLike(contact) ? (vi ? " và qua email của bạn." : " and by email.") : "."}
            </p>
          )}
          {closedByAdmin && <p className="muted text-center text-xs">{vi ? "Cuộc trò chuyện đã được đánh dấu xong. Bạn vẫn có thể nhắn tiếp." : "Marked as resolved. You can still reply."}</p>}
        </div>

        <form onSubmit={send} className="space-y-2 border-t px-3 py-3" style={{ borderColor: "var(--border)" }}>
          {!session && (
            <div className="grid grid-cols-2 gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={vi ? "Tên của bạn *" : "Your name *"} className="input py-1.5" maxLength={60} aria-label={vi ? "Tên" : "Name"} />
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={vi ? "Email / Zalo (tuỳ chọn)" : "Email (optional)"}
                className="input py-1.5"
                maxLength={120}
                aria-label="Contact"
              />
              {/* Ô bẫy bot: ẩn với người dùng */}
              <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={maximized ? 3 : 2}
              maxLength={2000}
              placeholder={vi ? "Nhập tin nhắn... (Enter để gửi)" : "Type a message... (Enter to send)"}
              className="input max-h-40 flex-1 resize-none"
              aria-label={vi ? "Tin nhắn" : "Message"}
            />
            <button type="submit" disabled={sending || !draft.trim()} className="btn-primary h-10 shrink-0 px-4" aria-label={vi ? "Gửi" : "Send"}>
              ➤
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="muted flex flex-wrap items-center justify-between gap-2 text-[11px]">
            {variant === "portfolio" ? (
              <span className="flex flex-wrap gap-3">
                {site?.profile.email && (
                  <a href={`mailto:${site.profile.email}`} className="hover:text-brand-600">
                    ✉ Email
                  </a>
                )}
                <Link href="/cv" className="hover:text-brand-600">
                  📄 CV
                </Link>
                {showPhone && site?.profile.zaloPhone && (
                  <a href={`https://zalo.me/${site.profile.zaloPhone}`} target="_blank" rel="noreferrer" className="hover:text-brand-600">
                    Zalo
                  </a>
                )}
                {showPhone && site?.profile.phone && (
                  <a href={`tel:${site.profile.phone}`} className="hover:text-brand-600">
                    📞 Call
                  </a>
                )}
              </span>
            ) : variant === "shop" ? (
              <Link href="/shop/don-hang" className="hover:text-brand-600">
                📦 {vi ? "Tra cứu đơn hàng" : "Track an order"}
              </Link>
            ) : (
              <Link href={`/${hub}/docs`} className="hover:text-brand-600">
                📚 {vi ? "Xem tài liệu sửa lỗi" : "Troubleshooting docs"}
              </Link>
            )}
            {session && (
              <button
                type="button"
                className="hover:text-brand-600"
                onClick={() => {
                  if (window.confirm(vi ? "Bắt đầu cuộc trò chuyện mới? Bạn sẽ không xem lại được cuộc hiện tại trên máy này." : "Start a new conversation?")) resetSession();
                }}
              >
                {vi ? "Cuộc trò chuyện mới" : "New conversation"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Nút mở chat (ẩn khi khung đang mở để không đè lên ô nhập; thu gọn bằng nút — ở header) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-[61] grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-2xl text-white shadow-xl transition hover:scale-105 hover:bg-brand-700 ${open ? "hidden" : ""}`}
        aria-label={open ? (vi ? "Đóng chat" : "Close chat") : vi ? "Chat với Mr Jay" : "Chat with Mr Jay"}
        aria-expanded={open}
      >
        {open ? "✕" : "💬"}
        {!open && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
