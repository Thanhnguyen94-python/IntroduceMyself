// Phân quyền SMT Workspace (dùng chung client + server). Một chỗ duy nhất để đọc "ai được làm gì".
//
//  Admin    : toàn quyền (kể cả nghiệm thu / chấm điểm, tài khoản, cài đặt line & KPI, xoá thẳng).
//  Trợ lý   : nhập dữ liệu SMT, giao / sửa việc, duyệt việc kỹ sư đề xuất, quản lý kỹ sư & kênh chat,
//             đặt lịch báo cáo. KHÔNG nghiệm thu / chấm điểm. Xoá phải xin quyền admin (xem delete-grants.ts).
//             Chỉ trong /smt: không vào được /admin, shop, firmware, nội dung Portfolio.
//  Kỹ sư    : xem bảng việc của đội, cập nhật việc CỦA MÌNH (tiến độ, giờ, ghi chú, gửi nghiệm thu),
//             đề xuất việc phát sinh (chờ duyệt mới tính điểm), chỉ thấy điểm của mình, chat.

export type SmtRole = "admin" | "assistant" | "engineer";

export type SmtActor = { role: SmtRole; id: string; name: string; engineerId: string | null; mustChangePassword?: boolean };

export const ROLE_LABEL: Record<SmtRole, { vi: string; en: string }> = {
  admin: { vi: "Quản lý (Admin)", en: "Manager (Admin)" },
  assistant: { vi: "Trợ lý", en: "Assistant" },
  engineer: { vi: "Kỹ sư", en: "Engineer" }
};

const RULES = {
  "data.write": ["admin", "assistant"],
  "tasks.manage": ["admin", "assistant"],
  "tasks.review": ["admin"],
  "tasks.updateOwn": ["admin", "assistant", "engineer"],
  "tasks.propose": ["engineer"],
  "team.viewAll": ["admin", "assistant"],
  "engineers.manage": ["admin", "assistant"],
  "accounts.manage": ["admin"],
  "settings.lines": ["admin"],
  "schedule.edit": ["admin", "assistant"],
  "channels.manage": ["admin", "assistant"],
  "chat.post": ["admin", "assistant", "engineer"],
  "delete.direct": ["admin"],
  "delete.request": ["assistant"],
  "delete.decide": ["admin"],
  "ai.configure": ["admin"]
} as const satisfies Record<string, readonly SmtRole[]>;

export type SmtPermission = keyof typeof RULES;

export function can(actor: Pick<SmtActor, "role"> | null | undefined, permission: SmtPermission) {
  return Boolean(actor && (RULES[permission] as readonly SmtRole[]).includes(actor.role));
}

export const isStaff = (actor: Pick<SmtActor, "role"> | null | undefined) => can(actor, "data.write");
