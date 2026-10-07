import { NextResponse } from "next/server";
import { normalizeExperienceData, normalizeProjectsData, normalizeSiteData } from "@/lib/content/normalizers";
import type { ExperienceData, ProjectsData, SiteData } from "@/lib/content/types";
import { readJourneyData } from "@/lib/journey-store";
import { readProjectsData } from "@/lib/projects-store";
import { readSiteData } from "@/lib/site-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

type ToolResult = {
  text: string;
  data: Record<string, unknown>;
};

const TOOL_DEFINITIONS = [
  {
    name: "Thông Tin Cá Nhân - thong_tin_ca_nhan",
    functionName: "thong_tin_ca_nhan",
    aliases: ["get_personal_info"],
    description: "Tra cứu thông tin cá nhân, mục tiêu công việc và kỹ năng chính của Nguyễn Văn Thạnh",
    inputSchema: {
      type: "object",
      properties: {
        lang: {
          type: "string",
          enum: ["vi", "en"],
          default: "vi"
        }
      }
    }
  },
  {
    name: "Kinh Nghiệm SMT - kinh_nghiem_smt",
    functionName: "kinh_nghiem_smt",
    aliases: ["get_smt_experience"],
    description: "Tra cứu lịch sử làm việc, kinh nghiệm lập trình SMT, cân bằng chuyền Line Balance và thiết bị xưởng của Nguyễn Văn Thạnh",
    inputSchema: {
      type: "object",
      properties: {
        lang: {
          type: "string",
          enum: ["vi", "en"],
          default: "vi"
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 20,
          default: 8
        }
      }
    }
  },
  {
    name: "Danh Sách Dự Án - danh_sach_du_an",
    functionName: "danh_sach_du_an",
    aliases: ["get_projects"],
    description: "Tra cứu danh sách các dự án thực tế, phần mềm và sản phẩm tiêu biểu của Nguyễn Văn Thạnh",
    inputSchema: {
      type: "object",
      properties: {
        lang: {
          type: "string",
          enum: ["vi", "en"],
          default: "vi"
        },
        category: {
          type: "string",
          enum: ["3d-jig", "app-software", "smt-improvement", "ai-iot"]
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 20,
          default: 8
        }
      }
    }
  }
] as const;

type JourneyRow = {
  id: string;
  company: string;
  role_vi: string;
  role_en: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  equipment_tags: string[] | null;
  achievements_vi: string[] | null;
  achievements_en: string[] | null;
  improvements_vi: string[] | null;
  improvements_en: string[] | null;
  sort_order: number;
};

type ProjectRow = {
  id: string;
  slug: string;
  title_vi: string;
  title_en: string;
  category: "3d-jig" | "app-software" | "smt-improvement" | "ai-iot";
  status: "ongoing" | "completed";
  summary_vi: string;
  summary_en: string;
  objective_vi: string;
  objective_en: string;
  equipment_tags: string[] | null;
  sort_order: number;
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-requested-with",
  "Access-Control-Max-Age": "86400"
};

function withCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

function jsonOk(id: JsonRpcId, result: Record<string, unknown>) {
  return withCors(
    NextResponse.json({
      jsonrpc: "2.0",
      id,
      result
    })
  );
}

function jsonError(id: JsonRpcId, code: number, message: string, status = 400, data?: Record<string, unknown>) {
  return withCors(
    NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: {
          code,
          message,
          ...(data ? { data } : {})
        }
      },
      { status }
    )
  );
}

function toLanguage(input: unknown): "vi" | "en" {
  return input === "en" ? "en" : "vi";
}

function asLimit(input: unknown, fallback = 6) {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(20, Math.floor(value));
}

function normalizeToolName(input: string) {
  const name = input.trim();
  if (["thong_tin_ca_nhan", "get_personal_info", "Thông Tin Cá Nhân - thong_tin_ca_nhan"].includes(name)) {
    return "thong_tin_ca_nhan" as const;
  }

  if (["kinh_nghiem_smt", "get_smt_experience", "Kinh Nghiệm SMT - kinh_nghiem_smt"].includes(name)) {
    return "kinh_nghiem_smt" as const;
  }

  if (["danh_sach_du_an", "get_projects", "Danh Sách Dự Án - danh_sach_du_an"].includes(name)) {
    return "danh_sach_du_an" as const;
  }

  return "";
}

async function readSiteFromSupabase(): Promise<SiteData | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("site_content")
    .select("config_key,payload")
    .eq("config_key", "primary")
    .maybeSingle();

  if (error || !data || typeof data !== "object") return null;

  const payload = (data as { payload?: SiteData }).payload;
  if (!payload || typeof payload !== "object") return null;
  return normalizeSiteData(payload);
}

async function readJourneyFromSupabase(): Promise<ExperienceData | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("career_journey")
    .select("id,company,role_vi,role_en,start_date,end_date,is_current,equipment_tags,achievements_vi,achievements_en,improvements_vi,improvements_en,sort_order")
    .order("sort_order", { ascending: true });

  if (error || !Array.isArray(data)) return null;

  const rows = data as JourneyRow[];
  return normalizeExperienceData({
    schemaVersion: 1,
    items: rows.map((row) => ({
      id: row.id,
      company: row.company ?? "",
      role: {
        vi: row.role_vi ?? "",
        en: row.role_en ?? ""
      },
      startDate: row.start_date ?? "",
      endDate: row.end_date ?? "",
      isCurrent: Boolean(row.is_current),
      equipmentTags: Array.isArray(row.equipment_tags) ? row.equipment_tags : [],
      responsibilities: { vi: [], en: [] },
      problemRootCauseAction: { vi: [], en: [] },
      trainingActivities: { vi: [], en: [] },
      achievements: {
        vi: Array.isArray(row.achievements_vi) ? row.achievements_vi : [],
        en: Array.isArray(row.achievements_en) ? row.achievements_en : []
      },
      improvements: {
        vi: Array.isArray(row.improvements_vi) ? row.improvements_vi : [],
        en: Array.isArray(row.improvements_en) ? row.improvements_en : []
      },
      images: []
    }))
  });
}

async function readProjectsFromSupabase(): Promise<ProjectsData | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("id,slug,title_vi,title_en,category,status,summary_vi,summary_en,objective_vi,objective_en,equipment_tags,sort_order")
    .order("sort_order", { ascending: true });

  if (error || !Array.isArray(data)) return null;

  const rows = data as ProjectRow[];
  return normalizeProjectsData({
    schemaVersion: 1,
    items: rows.map((row) => ({
      id: row.id,
      slug: row.slug ?? row.id,
      title: {
        vi: row.title_vi ?? "",
        en: row.title_en ?? ""
      },
      category: row.category,
      status: row.status,
      summary: {
        vi: row.summary_vi ?? "",
        en: row.summary_en ?? ""
      },
      objective: {
        vi: row.objective_vi ?? "",
        en: row.objective_en ?? ""
      },
      description: { vi: "", en: "" },
      equipmentTags: Array.isArray(row.equipment_tags) ? row.equipment_tags : [],
      gallery: [],
      attachments: [],
      lessonsLearned: { vi: [], en: [] }
    }))
  });
}

async function readContextData(): Promise<{ site: SiteData; journey: ExperienceData; projects: ProjectsData }> {
  const [siteDb, journeyDb, projectsDb] = await Promise.all([
    readSiteFromSupabase(),
    readJourneyFromSupabase(),
    readProjectsFromSupabase()
  ]);

  const site = siteDb ?? (await readSiteData());
  const journey = journeyDb ?? (await readJourneyData());
  const projects = projectsDb ?? (await readProjectsData());

  return {
    site,
    journey,
    projects
  };
}

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { site, journey, projects } = await readContextData();
  const lang = toLanguage(args.lang);
  const toolName = normalizeToolName(name);

  if (toolName === "thong_tin_ca_nhan") {
    const profile = site.profile;
    const payload = {
      fullName: profile.fullName,
      displayName: profile.displayName,
      title: profile.title[lang] || profile.title.vi,
      slogan: profile.slogan[lang] || profile.slogan.vi,
      location: profile.location,
      phone: profile.phone,
      email: profile.email,
      highlights: site.highlights[lang] || site.highlights.vi
    };

    return {
      text: `${payload.fullName} (${payload.displayName}) - ${payload.title}`,
      data: payload
    };
  }

  if (toolName === "kinh_nghiem_smt") {
    const limit = asLimit(args.limit, 8);
    const items = journey.items.slice(0, limit).map((item) => ({
      id: item.id,
      company: item.company,
      role: item.role[lang] || item.role.vi,
      period: `${item.startDate} - ${item.isCurrent ? "present" : item.endDate}`,
      achievements: item.achievements[lang] || item.achievements.vi,
      improvements: item.improvements[lang] || item.improvements.vi,
      equipmentTags: item.equipmentTags
    }));

    return {
      text: `SMT experience items: ${items.length}`,
      data: {
        total: journey.items.length,
        items
      }
    };
  }

  if (toolName === "danh_sach_du_an") {
    const limit = asLimit(args.limit, 8);
    const category = typeof args.category === "string" ? args.category.trim() : "";

    const filtered = projects.items.filter((item) => (category ? item.category === category : true)).slice(0, limit);

    const items = filtered.map((item) => ({
      id: item.id,
      slug: item.slug,
      category: item.category,
      status: item.status,
      title: item.title[lang] || item.title.vi,
      summary: item.summary[lang] || item.summary.vi,
      objective: item.objective[lang] || item.objective.vi,
      equipmentTags: item.equipmentTags
    }));

    return {
      text: `Project items: ${items.length}`,
      data: {
        total: projects.items.length,
        items
      }
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  return withCors(
    NextResponse.json({
      name: "introducemyself-mcp",
      status: "ok",
      transport: "http-jsonrpc",
      endpoint: "/api/mcp",
      methods: ["initialize", "tools/list", "tools/call", "ping"]
    })
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as JsonRpcRequest | null;

  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return jsonError(null, -32600, "Invalid Request", 400);
  }

  const id: JsonRpcId = body.id ?? null;
  const params = body.params ?? {};

  try {
    if (body.method === "ping") {
      return jsonOk(id, { pong: true });
    }

    if (body.method === "initialize") {
      return jsonOk(id, {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "introducemyself-mcp",
          version: "1.0.0"
        },
        capabilities: {
          tools: {
            listChanged: false
          }
        }
      });
    }

    if (body.method === "tools/list") {
      return jsonOk(id, {
        tools: TOOL_DEFINITIONS
      });
    }

    if (body.method === "tools/call") {
      const name = typeof params.name === "string" ? params.name : "";
      const args = typeof params.arguments === "object" && params.arguments ? (params.arguments as Record<string, unknown>) : {};

      if (!name) {
        return jsonError(id, -32602, "Invalid params: missing tool name", 400);
      }

      const output = await handleToolCall(name, args);
      return jsonOk(id, {
        content: [{ type: "text", text: output.text }],
        structuredContent: output.data
      });
    }

    return jsonError(id, -32601, `Method not found: ${body.method}`, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal MCP server error";
    return jsonError(id, -32000, message, 500);
  }
}
