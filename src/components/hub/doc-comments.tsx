"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { getVisitorId, readStoredJson, writeStoredJson } from "@/lib/visitor-id";
import type { PublicComment } from "@/lib/chat/comments-store";

type PendingMine = { id: string; name: string; body: string; createdAt: string; parentId: string | null };

const MINE_KEY = "mj_doc_questions";

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Avatar({ name, admin }: { name: string; admin: boolean }) {
  return (
    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${admin ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"}`}>
      {admin ? "MJ" : name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

// Hỏi đáp dưới mỗi bài tài liệu: câu hỏi chờ admin duyệt rồi mới hiện công khai.
export function DocComments({ hub, path }: { hub: string; path: string }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const [items, setItems] = useState<PublicComment[]>([]);
  const [mine, setMine] = useState<PendingMine[]>([]);
  const [replyTo, setReplyTo] = useState<PublicComment | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const data = (await fetch(`/api/comments?${new URLSearchParams({ hub, path })}`, { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null)) as { items?: PublicComment[] } | null;
    const list = data?.items ?? [];
    setItems(list);
    // Câu hỏi của mình đã được duyệt thì bỏ khỏi danh sách "đang chờ".
    const published = new Set(list.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]));
    const stored = (readStoredJson<PendingMine[]>(MINE_KEY) ?? []).filter((m) => !published.has(m.id));
    writeStoredJson(MINE_KEY, stored);
    setMine(stored);
  }, [hub, path]);

  useEffect(() => {
    load();
    const profile = readStoredJson<{ name?: string; contact?: string }>("mj_chat_profile");
    if (profile?.name) setName(profile.name);
    if (profile?.contact) setContact(profile.contact);
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setSending(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hub, path, name, contact, body, parentId: replyTo?.id ?? null, visitorId: getVisitorId().id, website: honeypot })
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { id?: string; message?: string } | null;
    setSending(false);
    if (!res?.ok || !data?.id) {
      setNotice({ type: "error", text: data?.message ?? (vi ? "Không gửi được, thử lại sau." : "Couldn't send.") });
      return;
    }
    const entry: PendingMine = { id: data.id, name, body, createdAt: new Date().toISOString(), parentId: replyTo?.id ?? null };
    const next = [...(readStoredJson<PendingMine[]>(MINE_KEY) ?? []), entry].slice(-50);
    writeStoredJson(MINE_KEY, next);
    writeStoredJson("mj_chat_profile", { name, contact });
    setMine(next.filter((m) => m.id !== "ok"));
    setBody("");
    setReplyTo(null);
    setNotice({
      type: "ok",
      text: vi
        ? `Đã gửi! Câu hỏi sẽ hiện công khai sau khi Jay duyệt${contact.includes("@") ? ", câu trả lời cũng được gửi vào email của bạn" : ""}.`
        : "Sent! It will appear once approved."
    });
  }

  const pendingFor = (parentId: string | null) => mine.filter((m) => m.parentId === parentId);
  const total = items.length;

  return (
    <section id="hoi-dap" className="mt-14 scroll-mt-24 border-t pt-8" style={{ borderColor: "var(--border)" }}>
      <h2 className="text-xl font-bold">
        💬 {vi ? "Hỏi đáp" : "Questions & answers"} {total > 0 && <span className="muted text-base font-normal">({total})</span>}
      </h2>
      <p className="muted mt-1 text-sm">
        {vi ? "Gặp khó ở bước nào trong bài này? Đặt câu hỏi, Jay sẽ trả lời ngay bên dưới để người sau cũng tham khảo được." : "Stuck on a step? Ask here so others can learn from the answer too."}
      </p>

      <ul className="mt-6 space-y-4">
        {items.map((c) => (
          <li key={c.id} className="card space-y-3">
            <div className="flex gap-3">
              <Avatar name={c.name} admin={c.isAdmin} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <b>{c.name}</b> <span className="muted text-xs">· {dateLabel(c.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </div>
            </div>
            {[...c.replies, ...pendingFor(c.id).map((m) => ({ id: m.id, name: m.name, body: m.body, isAdmin: false, createdAt: m.createdAt, replies: [], pending: true }))].map((r) => (
              <div key={r.id} className={`ml-11 flex gap-3 rounded-xl p-3 ${r.isAdmin ? "bg-brand-500/10" : ""}`} style={r.isAdmin ? undefined : { background: "color-mix(in srgb, var(--border) 30%, transparent)" }}>
                <Avatar name={r.name} admin={r.isAdmin} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <b>{r.name}</b>
                    {r.isAdmin && <span className="chip ml-2 text-[10px]">{vi ? "Tác giả" : "Author"}</span>}
                    <span className="muted text-xs"> · {"pending" in r ? (vi ? "đang chờ duyệt" : "awaiting approval") : dateLabel(r.createdAt)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{r.body}</p>
                </div>
              </div>
            ))}
            <button type="button" className="ml-11 text-xs font-semibold text-brand-600 dark:text-brand-300" onClick={() => setReplyTo(c)}>
              ↩ {vi ? "Hỏi thêm trong chủ đề này" : "Follow up"}
            </button>
          </li>
        ))}
        {pendingFor(null).map((m) => (
          <li key={m.id} className="card border-dashed opacity-80">
            <div className="flex gap-3">
              <Avatar name={m.name} admin={false} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <b>{m.name}</b> <span className="chip ml-1 text-[10px]">{vi ? "Đang chờ duyệt · chỉ bạn thấy" : "Awaiting approval · only you"}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>
              </div>
            </div>
          </li>
        ))}
        {!items.length && !mine.length && <li className="muted text-sm">{vi ? "Chưa có câu hỏi nào. Bạn là người đầu tiên!" : "No questions yet."}</li>}
      </ul>

      <form onSubmit={submit} className="card mt-6 space-y-3">
        <p className="font-semibold">
          {replyTo ? (
            <>
              ↩ {vi ? "Hỏi thêm về câu của" : "Following up on"} <b>{replyTo.name}</b>{" "}
              <button type="button" className="muted ml-1 text-xs underline" onClick={() => setReplyTo(null)}>
                {vi ? "huỷ" : "cancel"}
              </button>
            </>
          ) : vi ? (
            "Đặt câu hỏi"
          ) : (
            "Ask a question"
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={vi ? "Tên hiển thị *" : "Display name *"} className="input" maxLength={60} required />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={vi ? "Email nhận trả lời (không công khai)" : "Email for replies (private)"} className="input" maxLength={120} />
          <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={3000}
          required
          placeholder={vi ? "Mô tả vấn đề: bạn đang ở bước nào, đã thử gì, báo lỗi gì (dán link ảnh/video nếu có)..." : "Describe the problem..."}
          className="input resize-y"
        />
        {notice && <p className={`text-sm ${notice.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{notice.text}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="muted text-xs">{vi ? "Câu hỏi hiển thị sau khi được duyệt. Email không bao giờ hiển thị công khai." : "Shown after approval. Email is never public."}</p>
          <button className="btn-primary" disabled={sending || body.trim().length < 5 || !name.trim()}>
            {sending ? (vi ? "Đang gửi..." : "Sending...") : vi ? "Gửi câu hỏi" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
