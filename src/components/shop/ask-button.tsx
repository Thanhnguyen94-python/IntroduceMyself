"use client";

import { openChat } from "@/components/chat/chat-widget";

// Nút mở box chat (có thể điền sẵn câu hỏi), dùng được trong server component.
export function AskButton({ message, className = "btn-ghost", children }: { message?: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => openChat(message)}>
      {children}
    </button>
  );
}
