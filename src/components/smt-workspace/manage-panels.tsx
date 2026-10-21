"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/smt/smt-charts";
import type { PublicAccount } from "@/lib/smt/accounts";
import type { ChatChannel } from "@/lib/smt/chat-store";
import type { DeleteRequest, DeleteScope } from "@/lib/smt/delete-grants";
import type { Engineer } from "@/lib/smt/team-types";
import type { WorkspaceSettings } from "@/lib/smt/workspace-settings";

// Các khối của trang /smt/quan-tri. Mỗi khối tự gọi API của nó; server kiểm tra quyền lại lần nữa.

async function call<T>(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(data.message || "Thất bại.");
  return data;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

function Panel({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="muted text-sm">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// ---------- Tài khoản (admin) ----------
export function AccountsPanel({ engineers }: { engineers: Engineer[] }) {
  const t = useT();
  const [items, setItems] = useState<PublicAccount[]>([]);
  const [draft, setDraft] = useState({ username: "", display_name: "", role: "engineer", engineer_id: "" });
  const [secret, setSecret] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => call<{ items: PublicAccount[] }>("/api/smt/accounts").then((d) => setItems(d.items)).catch((e: Error) => setError(e.message)), []);
  useEffect(() => void load(), [load]);
  const linked = new Set(items.map((a) => a.engineer_id).filter(Boolean));

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thất bại.");
    }
  }

  return (
    <Panel id="tai-khoan" title={t("Tài khoản trợ lý & kỹ sư", "Assistant & engineer accounts")} hint={t("Tạo tài khoản → đưa tên đăng nhập + mật khẩu tạm cho người dùng; lần đầu đăng nhập họ phải tự đổi mật khẩu. Khoá / đổi quyền / đặt lại mật khẩu sẽ đăng xuất họ khỏi mọi thiết bị.", "Create an account → hand over the username + temporary password; they must change it on first sign-in. Locking / role change / reset signs them out everywhere.")}>
      {secret && (
        <div className="rounded-lg border-2 border-dashed p-3 text-sm" style={{ borderColor: "var(--viz-1)" }} role="status">
          🔑 {t("Mật khẩu tạm của", "Temporary password for")} <b>{secret.username}</b>: <code className="text-base font-bold">{secret.password}</code>
          <span className="muted block text-xs">{t("Chỉ hiện 1 lần. Gửi riêng cho người dùng (Zalo / trực tiếp).", "Shown once. Send it privately.")}</span>
          <button type="button" className="mt-1 text-xs underline" onClick={() => setSecret(null)}>
            {t("Đã ghi lại", "Noted")}
          </button>
        </div>
      )}
      <form
        className="grid gap-2 rounded-xl border p-3 text-sm sm:grid-cols-5"
        style={{ borderColor: "var(--border)" }}
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const d = await call<{ password: string; item: PublicAccount }>("/api/smt/accounts", "POST", draft);
            setSecret({ username: d.item.username, password: d.password });
            setDraft({ username: "", display_name: "", role: "engineer", engineer_id: "" });
          });
        }}
      >
        <input className="input" placeholder={t("Tên đăng nhập (vd nam.nh)", "Username")} value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value.toLowerCase() })} required />
        <input className="input" placeholder={t("Tên hiển thị", "Display name")} value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
        <select className="input" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} aria-label={t("Vai trò", "Role")}>
          <option value="engineer">{t("Kỹ sư", "Engineer")}</option>
          <option value="assistant">{t("Trợ lý", "Assistant")}</option>
        </select>
        <select className="input" value={draft.engineer_id} onChange={(e) => setDraft({ ...draft, engineer_id: e.target.value, display_name: draft.display_name || engineers.find((x) => x.id === e.target.value)?.name || "" })} disabled={draft.role !== "engineer"} aria-label={t("Hồ sơ kỹ sư", "Engineer profile")}>
          <option value="">{t("— gắn hồ sơ kỹ sư —", "— link engineer —")}</option>
          {engineers.filter((x) => !linked.has(x.id)).map((x) => (
            <option key={x.id} value={x.id}>
              {x.code} · {x.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          + {t("Tạo tài khoản", "Create")}
        </button>
      </form>
      {draft.role === "engineer" && !engineers.length && <p className="text-xs text-amber-700 dark:text-amber-300">! {t("Chưa có hồ sơ kỹ sư thật. Thêm ở trang Đội ngũ (chế độ Thực tế) trước để gắn tài khoản.", "No live engineer profiles yet. Add them on the Team page (Live mode) first.")}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="muted text-left text-xs">
              <th className="py-1">{t("Tài khoản", "Account")}</th>
              <th className="py-1">{t("Vai trò", "Role")}</th>
              <th className="py-1">{t("Hồ sơ kỹ sư", "Engineer")}</th>
              <th className="py-1">{t("Đăng nhập gần nhất", "Last sign-in")}</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className={`border-t ${a.active ? "" : "muted line-through"}`} style={{ borderColor: "var(--border)" }}>
                <td className="py-1.5">
                  <b>{a.display_name}</b> <span className="muted">({a.username})</span>
                  {a.must_change_password && <span className="muted block text-xs">{t("chưa đổi mật khẩu tạm", "temp password not changed")}</span>}
                </td>
                <td className="py-1.5">
                  <select className="input w-auto py-1" value={a.role} onChange={(e) => void run(() => call("/api/smt/accounts", "PATCH", { id: a.id, role: e.target.value }))} aria-label={t("Vai trò", "Role")}>
                    <option value="engineer">{t("Kỹ sư", "Engineer")}</option>
                    <option value="assistant">{t("Trợ lý", "Assistant")}</option>
                  </select>
                </td>
                <td className="py-1.5">
                  {a.role === "engineer" ? (
                    <select className="input w-auto py-1" value={a.engineer_id ?? ""} onChange={(e) => void run(() => call("/api/smt/accounts", "PATCH", { id: a.id, engineer_id: e.target.value }))} aria-label={t("Hồ sơ kỹ sư", "Engineer")}>
                      <option value="">—</option>
                      {engineers.filter((x) => x.id === a.engineer_id || !linked.has(x.id)).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.code} · {x.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="muted py-1.5 text-xs">{when(a.last_login_at)}</td>
                <td className="py-1.5 text-right text-xs font-semibold">
                  <button type="button" className="mr-3 text-brand-600 dark:text-brand-300" onClick={() => void run(() => call("/api/smt/accounts", "PATCH", { id: a.id, active: !a.active }))}>
                    {a.active ? t("Khoá", "Lock") : t("Mở khoá", "Unlock")}
                  </button>
                  <button
                    type="button"
                    className="mr-3 text-brand-600 dark:text-brand-300"
                    onClick={() =>
                      confirm(t(`Đặt lại mật khẩu cho ${a.username}?`, `Reset password for ${a.username}?`)) &&
                      void run(async () => setSecret({ username: a.username, password: (await call<{ password: string }>("/api/smt/accounts", "PATCH", { id: a.id, action: "reset" })).password }))
                    }
                  >
                    {t("Đặt lại MK", "Reset PW")}
                  </button>
                  <button type="button" className="text-red-600" onClick={() => confirm(t(`Xoá tài khoản ${a.username}? (Lịch sử công việc vẫn giữ)`, `Delete ${a.username}?`)) && void run(() => call(`/api/smt/accounts?id=${a.id}`, "DELETE"))}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="muted py-3 text-center">
                  {t("Chưa có tài khoản nào.", "No accounts yet.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---------- Yêu cầu xoá ----------
const SCOPE_LABEL: Record<DeleteScope, { vi: string; en: string }> = { once: { vi: "Chỉ lần này", en: "This time" }, day: { vi: "Trong hôm nay", en: "Today" }, month: { vi: "Trong 1 tháng", en: "1 month" } };
const STATUS_LABEL: Record<DeleteRequest["status"], { vi: string; en: string }> = { pending: { vi: "Chờ duyệt", en: "Pending" }, approved: { vi: "Đã duyệt", en: "Approved" }, rejected: { vi: "Từ chối", en: "Rejected" }, cancelled: { vi: "Đã huỷ", en: "Cancelled" } };

export function DeleteRequestsPanel({ admin }: { admin: boolean }) {
  const t = useT();
  const [items, setItems] = useState<DeleteRequest[]>([]);
  const [grant, setGrant] = useState<DeleteRequest | null>(null);
  const [scope, setScope] = useState<Record<string, DeleteScope>>({});
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      call<{ items: DeleteRequest[]; grant: DeleteRequest | null }>("/api/smt/delete-requests")
        .then((d) => (setItems(d.items), setGrant(d.grant)))
        .catch((e: Error) => setError(e.message)),
    []
  );
  useEffect(() => void load(), [load]);

  async function act(body: Record<string, unknown>) {
    setError("");
    try {
      await call("/api/smt/delete-requests", "PATCH", body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thất bại.");
    }
  }

  const pending = items.filter((r) => r.status === "pending");
  const history = items.filter((r) => r.status !== "pending").slice(0, 20);
  return (
    <Panel
      id="xoa"
      title={admin ? t(`Yêu cầu xoá dữ liệu (${pending.length} chờ duyệt)`, `Delete requests (${pending.length} pending)`) : t("Quyền xoá của tôi", "My delete permission")}
      hint={admin ? t("Duyệt = xoá ngay các dòng được yêu cầu. Chọn thời hạn để trợ lý được xoá thẳng tiếp trong hôm nay / 1 tháng; hết hạn phải xin lại.", "Approve = delete the requested rows now. Pick a duration to let the assistant delete directly today / for a month.") : t("Lần đầu bấm xoá sẽ gửi yêu cầu cho quản lý. Khi được duyệt kèm thời hạn, bạn xoá thẳng được tới hết hạn.", "Your first delete sends a request. Once approved with a duration, you can delete directly until it expires.")}
    >
      {!admin && <p className="text-sm">{grant ? `✓ ${t("Được xoá thẳng đến", "Can delete directly until")} ${when(grant.expires_at)}` : t("Hiện chưa có quyền xoá thẳng.", "No direct-delete permission right now.")}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2 text-sm">
        {pending.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
            <span className="min-w-0 flex-1">
              <b>{r.requester}</b> · {r.target.label} {r.target.demo && <span className="muted">(demo)</span>}
              <span className="muted block text-xs">
                {when(r.created_at)} · {t("Lý do", "Reason")}: {r.reason || "—"}
              </span>
            </span>
            {admin ? (
              <>
                <select className="input w-auto py-1" value={scope[r.id] ?? "once"} onChange={(e) => setScope({ ...scope, [r.id]: e.target.value as DeleteScope })} aria-label={t("Thời hạn", "Duration")}>
                  {(Object.keys(SCOPE_LABEL) as DeleteScope[]).map((s) => (
                    <option key={s} value={s}>
                      {t(SCOPE_LABEL[s].vi, SCOPE_LABEL[s].en)}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-primary py-1" onClick={() => act({ id: r.id, approve: true, scope: scope[r.id] ?? "once" })}>
                  ✓ {t("Duyệt & xoá", "Approve & delete")}
                </button>
                <button type="button" className="btn-ghost py-1" onClick={() => act({ id: r.id, approve: false })}>
                  {t("Từ chối", "Reject")}
                </button>
              </>
            ) : (
              <button type="button" className="btn-ghost py-1" onClick={() => act({ id: r.id, action: "cancel" })}>
                {t("Huỷ yêu cầu", "Cancel")}
              </button>
            )}
          </li>
        ))}
        {!pending.length && <li className="muted">{t("Không có yêu cầu chờ duyệt.", "No pending requests.")}</li>}
      </ul>
      {history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">{t("Lịch sử", "History")}</summary>
          <ul className="mt-2 space-y-1">
            {history.map((r) => (
              <li key={r.id} className="muted">
                {when(r.created_at)} · {r.requester} · {r.target.label} → {t(STATUS_LABEL[r.status].vi, STATUS_LABEL[r.status].en)}
                {r.scope && ` (${t(SCOPE_LABEL[r.scope].vi, SCOPE_LABEL[r.scope].en)}${r.scope !== "once" ? `, ${t("đến", "until")} ${when(r.expires_at)}` : ""})`}
                {r.decided_by && ` · ${r.decided_by}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}

// ---------- Lịch báo cáo + AI ----------
const WEEKDAYS = [
  [1, "Thứ Hai", "Monday"],
  [2, "Thứ Ba", "Tuesday"],
  [3, "Thứ Tư", "Wednesday"],
  [4, "Thứ Năm", "Thursday"],
  [5, "Thứ Sáu", "Friday"],
  [6, "Thứ Bảy", "Saturday"],
  [7, "Chủ nhật", "Sunday"]
] as const;

export function SchedulePanel({ admin }: { admin: boolean }) {
  const t = useT();
  const [s, setS] = useState<WorkspaceSettings | null>(null);
  const [ai, setAi] = useState<{ configured: boolean; provider: string; model: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [newTime, setNewTime] = useState("06:00");
  useEffect(() => {
    call<{ settings: WorkspaceSettings; ai: { configured: boolean; provider: string; model: string } }>("/api/smt/workspace-settings")
      .then((d) => (setS(d.settings), setAi(d.ai)))
      .catch((e: Error) => setMsg(e.message));
  }, []);
  if (!s) return <Panel id="lich" title={t("Lịch báo cáo tự động", "Auto-report schedule")}>{msg || "…"}</Panel>;
  const r = s.reports;
  const setR = (patch: Partial<WorkspaceSettings["reports"]>) => setS({ ...s, reports: { ...r, ...patch } });

  async function save() {
    setMsg("");
    try {
      const d = await call<{ settings: WorkspaceSettings }>("/api/smt/workspace-settings", "PUT", { settings: s });
      setS(d.settings);
      setMsg(t("Đã lưu.", "Saved."));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Thất bại.");
    }
  }

  return (
    <Panel id="lich" title={t("Lịch báo cáo tự động", "Auto-report schedule")} hint={t("Giờ chốt theo giờ Việt Nam. Đặt theo giờ kết thúc ca của nhà máy (vd 06:00, 14:00, 22:00): mỗi lần chốt tổng hợp từ lần chốt trước đến lúc đó.", "Vietnam time. Use your shift end times (e.g. 06:00, 14:00, 22:00): each cut-off covers the period since the previous one.")}>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={r.enabled} onChange={(e) => setR({ enabled: e.target.checked })} />
        {t("Bật báo cáo tự động", "Enable auto reports")}
      </label>
      <div className="space-y-1 text-sm">
        <p className="font-medium">{t("Giờ chốt báo cáo ngày / ca", "Daily / shift cut-off times")}</p>
        <div className="flex flex-wrap items-center gap-2">
          {r.dailyTimes.map((x) => (
            <span key={x} className="chip">
              {x}
              <button type="button" className="ml-1" onClick={() => r.dailyTimes.length > 1 && setR({ dailyTimes: r.dailyTimes.filter((y) => y !== x) })} aria-label={t(`Bỏ ${x}`, `Remove ${x}`)} disabled={r.dailyTimes.length <= 1}>
                ✕
              </button>
            </span>
          ))}
          <input type="time" className="input w-auto" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label={t("Giờ mới", "New time")} />
          <button type="button" className="btn-ghost" onClick={() => newTime && !r.dailyTimes.includes(newTime) && r.dailyTimes.length < 6 && setR({ dailyTimes: [...r.dailyTimes, newTime].sort() })}>
            + {t("Thêm giờ", "Add time")}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={r.weeklyEnabled} onChange={(e) => setR({ weeklyEnabled: e.target.checked })} />
          {t("Báo cáo tuần vào", "Weekly report on")}
        </label>
        <select className="input w-auto" value={r.weeklyDay} onChange={(e) => setR({ weeklyDay: Number(e.target.value) })} disabled={!r.weeklyEnabled} aria-label={t("Thứ", "Weekday")}>
          {WEEKDAYS.map(([n, vi, en]) => (
            <option key={n} value={n}>
              {t(vi, en)}
            </option>
          ))}
        </select>
        <input type="time" className="input w-auto" value={r.weeklyTime} onChange={(e) => setR({ weeklyTime: e.target.value })} disabled={!r.weeklyEnabled} aria-label={t("Giờ", "Time")} />
      </div>

      <div className="space-y-1 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
        <p className="font-medium">🤖 {t("Tóm tắt thảo luận bằng AI", "AI discussion summary")}</p>
        <p className="muted text-xs">
          {ai?.configured
            ? t(`Đã có khoá AI (${ai.provider} · ${ai.model}).`, `AI key present (${ai.provider} · ${ai.model}).`)
            : t("Chưa gắn khoá AI. Thêm biến môi trường AI_PROVIDER (anthropic | openai), AI_API_KEY, AI_MODEL trên Vercel → Settings → Environment Variables (hoặc .env.local), rồi deploy lại.", "No AI key yet. Add AI_PROVIDER (anthropic | openai), AI_API_KEY, AI_MODEL in Vercel → Settings → Environment Variables (or .env.local), then redeploy.")}
        </p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.aiSummary} onChange={(e) => setS({ ...s, aiSummary: e.target.checked })} disabled={!admin || !ai?.configured} />
          {t("Thêm tóm tắt AI vào báo cáo (chỉ admin bật được)", "Add AI summary to reports (admin only)")}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={save}>
          {t("Lưu lịch", "Save schedule")}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </Panel>
  );
}

// ---------- Kênh chat ----------
export function ChannelsPanel() {
  const t = useT();
  const [items, setItems] = useState<ChatChannel[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => call<{ items: ChatChannel[] }>("/api/smt/chat/channels").then((d) => setItems(d.items)).catch((e: Error) => setError(e.message)), []);
  useEffect(() => void load(), [load]);

  async function save(body: Partial<ChatChannel>) {
    setError("");
    try {
      await call("/api/smt/chat/channels", "POST", body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thất bại.");
    }
  }

  return (
    <Panel id="kenh" title={t("Kênh thảo luận", "Chat channels")} hint={t("Kênh mặc định tạo từ danh sách line trong Cài đặt SMT. Lưu trữ = ẩn kênh nhưng giữ lịch sử.", "Default channels come from the lines in SMT settings. Archive hides a channel but keeps its history.")}>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save({ name }).then(() => setName(""));
        }}
      >
        <input className="input w-auto flex-1" placeholder={t("Tên kênh mới", "New channel name")} value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className="btn-primary">
          + {t("Thêm kênh", "Add")}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="grid gap-2 text-sm md:grid-cols-2">
        {items.map((c) => (
          <li key={c.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${c.archived ? "muted" : ""}`} style={{ borderColor: "var(--border)" }}>
            <span className="truncate">
              {c.kind === "line" ? "🏭" : c.kind === "general" ? "📢" : "#"} {c.name}
            </span>
            <span className="flex shrink-0 gap-3 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <button
                type="button"
                onClick={() => {
                  const v = prompt(t("Tên kênh", "Channel name"), c.name);
                  if (v?.trim()) void save({ id: c.id, name: v });
                }}
              >
                ✎
              </button>
              <button type="button" onClick={() => void save({ id: c.id, archived: !c.archived })}>
                {c.archived ? t("Hiện lại", "Restore") : t("Lưu trữ", "Archive")}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
