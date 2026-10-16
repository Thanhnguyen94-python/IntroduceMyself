export const TOOL_DEFINITIONS = [
  {
    name: "Thông Tin Cá Nhân - thong_tin_ca_nhan",
    functionName: "thong_tin_ca_nhan",
    aliases: ["get_personal_info"],
    description: "Tra cứu thông tin cá nhân, mục tiêu công việc và kỹ năng chính của Nguyễn Văn Thạnh",
    inputSchema: {
      type: "object",
      properties: {
        lang: { type: "string", enum: ["vi", "en"], default: "vi", description: "Ngôn ngữ phản hồi" }
      }
    }
  },
  {
    name: "Kinh Nghiệm SMT - kinh_nghiem_smt",
    functionName: "kinh_nghiem_smt",
    aliases: ["get_smt_experience"],
    description: "Tra cứu lịch sử làm việc, kinh nghiệm lập trình SMT, cân bằng chuyền Line Balance và thiết bị xưởng",
    inputSchema: {
      type: "object",
      properties: {
        lang: { type: "string", enum: ["vi", "en"], default: "vi" },
        limit: { type: "number", minimum: 1, maximum: 20, default: 8 }
      }
    }
  },
  {
    name: "Danh Sách Dự Án - danh_sach_du_an",
    functionName: "danh_sach_du_an",
    aliases: ["get_projects"],
    description: "Tra cứu danh sách các dự án thực tế, phần mềm và sản phẩm tiêu biểu",
    inputSchema: {
      type: "object",
      properties: {
        lang: { type: "string", enum: ["vi", "en"], default: "vi" },
        category: { type: "string", enum: ["3d-jig", "app-software", "smt-improvement", "ai-iot"] },
        limit: { type: "number", minimum: 1, maximum: 20, default: 8 }
      }
    }
  },
  // ⭐ TOOL MỚI
  {
    name: "Thời Tiết - thoi_tiet",
    functionName: "thoi_tiet",
    aliases: ["get_weather"],
    description: "Tra cứu thời tiết hiện tại theo tên thành phố (VD: Hà Nội, Đà Nẵng, Hồ Chí Minh). Trả về nhiệt độ, độ ẩm, mô tả trời, sức gió.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Tên thành phố cần tra cứu" },
        lang: { type: "string", enum: ["vi", "en"], default: "vi" }
      },
      required: ["city"]
    }
  },
  {
    name: "Giá Vàng - gia_vang",
    functionName: "gia_vang",
    aliases: ["get_gold_price"],
    description: "Tra cứu giá vàng trong nước (SJC, DOJI, PNJ, Bảo Tín Minh Châu...) theo nguồn BTMC. Trả về giá mua - bán mới nhất.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Lọc theo tên loại vàng, VD: 'SJC', 'nhẫn', 'DOJI'. Bỏ trống để lấy top 5." },
        lang: { type: "string", enum: ["vi", "en"], default: "vi" }
      }
    }
  }
] as const;

export type CanonicalToolName =
  | "thong_tin_ca_nhan"
  | "kinh_nghiem_smt"
  | "danh_sach_du_an"
  | "thoi_tiet"
  | "gia_vang";

const NAME_LOOKUP = new Map<string, CanonicalToolName>();
for (const def of TOOL_DEFINITIONS) {
  NAME_LOOKUP.set(def.functionName, def.functionName as CanonicalToolName);
  NAME_LOOKUP.set(def.name, def.functionName as CanonicalToolName);
  for (const alias of def.aliases ?? []) {
    NAME_LOOKUP.set(alias, def.functionName as CanonicalToolName);
  }
}

export function normalizeToolName(input: string): CanonicalToolName | "" {
  return NAME_LOOKUP.get(input.trim()) ?? "";
}