# Hướng dẫn thêm MCP tool mới cho Xiaozhi

## 1. Kiến trúc

```
Xiaozhi Robot ──WS──► XiaozhiConnector (browser admin) ──HTTP──► /api/mcp ──► handler
                                     ▲                                          │
                                     └────────── response ◄──────────────────────┘
```

**2 file định nghĩa `TOOL_DEFINITIONS` và `handleToolCall` phải luôn đồng bộ.** Từ nay cả hai đều import từ `lib/mcp/tool-definitions.ts` → chỉ sửa 1 chỗ.

## 2. Quy ước đặt tên tool (tiếng Việt)

| Trường | Format | Ví dụ |
|---|---|---|
| `name` | `Tên hiển thị có dấu - slug_không_dấu` | `"Giá Vàng - gia_vang"` |
| `functionName` | `snake_case_không_dấu` (đây là tên LLM gọi) | `"gia_vang"` |
| `aliases` | Mảng tiếng Anh cho tương thích ngược | `["get_gold_price"]` |
| `description` | Tiếng Việt, mô tả rõ **khi nào robot nên gọi** | `"Tra cứu giá vàng..."` |

**Quy tắc vàng:** `functionName` **KHÔNG dấu, KHÔNG khoảng trắng, snake_case**. Vì LLM (và Xiaozhi pipeline) thường strip ký tự đặc biệt → dễ fail.

## 3. Thêm tool mới — 4 bước

### Bước 1: Viết handler trong `lib/mcp/tools/<tên>.ts`

Template tối thiểu:

```ts
import { cached } from "../cache";

export async function handleMyTool(args: Record<string, unknown>, lang: "vi" | "en") {
  // 1. Validate input
  const q = typeof args.q === "string" ? args.q.trim() : "";
  if (!q) throw new Error("Thiếu tham số 'q'");

  // 2. Gọi API (có cache nếu cần)
  const data = await cached(`my-tool:${q}`, 5 * 60 * 1000, async () => {
    const res = await fetch(`https://api.example.com?q=${encodeURIComponent(q)}`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`API lỗi: ${res.status}`);
    return res.json();
  });

  // 3. Format text ngắn gọn cho giọng nói (Xiaozhi đọc TTS)
  const text = lang === "vi"
    ? `Kết quả cho ${q}: ${data.value}`
    : `Result for ${q}: ${data.value}`;

  // 4. Trả về { text, data }
  return { text, data };
}
```

**Lưu ý format text cho TTS:**
- Ngắn (< 300 ký tự lý tưởng) — Xiaozhi đọc dài sẽ mất thời gian.
- Tránh ký tự `*`, `#`, `|` — TTS sẽ đọc lung tung.
- Số tiền dùng "triệu đồng" thay vì "87000000".

### Bước 2: Đăng ký trong `lib/mcp/tool-definitions.ts`

Thêm 1 object vào mảng `TOOL_DEFINITIONS` (như mẫu `thoi_tiet`).

### Bước 3: Import + thêm nhánh trong `route.ts`

```ts
import { handleMyTool } from "@/lib/mcp/tools/my-tool";

// ...trong handleToolCall, trước dòng throw cuối:
if (toolName === "my_tool") {
  return await handleMyTool(args, lang);
}
```

### Bước 4: Test

```bash
curl -X POST http://localhost:3000/api/mcp -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"my_tool","arguments":{"q":"test"}}}' | jq
```

Không cần khởi động lại Xiaozhi — tool mới tự xuất hiện trong `tools/list` lần gọi tiếp theo.

## 4. Các nguồn API miễn phí gợi ý

| Nhu cầu | API | Key? |
|---|---|---|
| Thời tiết | Open-Meteo | Không |
| Địa chỉ → tọa độ | Open-Meteo Geocoding | Không |
| Tỷ giá ngoại tệ | exchangerate.host / open.er-api.com | Không |
| Giá vàng VN | BTMC public API | Không (demo key) |
| Giá vàng thế giới | goldapi.io | Có (`GOLD_API_KEY`) |
| Tin tức VN | NewsAPI / VNExpress RSS | Tùy |
| Crypto | CoinGecko free | Không |
| Ngày âm lịch | `https://api.iching.vn/...` hoặc tự tính | Không |

## 5. Best practices

1. **Luôn cache** ít nhất 1–5 phút. Xiaozhi hay hỏi lặp → không cache là bị rate-limit.
2. **Throw `Error` với message tiếng Việt** — Xiaozhi sẽ đọc nguyên văn message lỗi cho user.
3. **Fallback dữ liệu**: nếu API ngoài chết, trả về câu "Hiện chưa lấy được dữ liệu X" thay vì crash.
4. **Không trả secret**: đảm bảo `data` không chứa `process.env.*`.
5. **Tên tool tiếng Việt KHÔNG dấu** — Xiaozhi ASR có thể đọc sai dấu.
6. **Giới hạn 5–6 item/lần** — nhiều hơn TTS đọc mệt.

## 6. Debug

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Xiaozhi không thấy tool | Quên thêm vào `TOOL_DEFINITIONS` HOẶC chưa restart Next dev |
| Gọi tool báo "Unknown tool" | `functionName` không khớp giữa router và definitions |
| Tool trả lỗi 500 | API ngoài lỗi — bật log trong browser console |
| Robot nói "tôi không biết" | Tool trả text quá dài hoặc chứa ký tự markdown |
| Gọi được từ curl, không gọi được từ Xiaozhi | Tab admin chưa mở → WS bridge không hoạt động |

## 7. Giới hạn hiện tại + hướng nâng cấp

**Giới hạn:** bridge WS chạy trong browser → phải mở tab admin 24/7.

**Nâng cấp (khi cần):** viết 1 script Node.js chạy độc lập để giữ kết nối WS thay cho browser:

```ts
// scripts/xiaozhi-bridge.mjs
import WebSocket from "ws";
// ... copy logic handleIncomingRpc + connect tới /api/mcp nhưng ở server
```

Chạy bằng PM2/systemd → Xiaozhi dùng được 24/7 mà không cần browser.