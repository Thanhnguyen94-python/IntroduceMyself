"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type RpcResponse = {
  jsonrpc?: string;
  id?: string | number | null;
  result?: Record<string, unknown>;
  error?: {
    code?: number;
    message?: string;
  };
};

type LogItem = {
  id: number;
  text: string;
  level: "info" | "error" | "success";
  timestamp: string;
};

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
type JsonRpcId = string | number | null;

type WsRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

type RobotConfig = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};

type RobotRuntime = {
  state: ConnectionState;
  url: string;
  lastError?: string;
};

const ROBOTS_STORAGE_KEY = "xiaozhi-robots-v1";
const defaultEndpoint = "wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN";

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
          default: "vi",
          description: "Ngôn ngữ phản hồi mong muốn"
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
          default: "vi",
          description: "Ngôn ngữ phản hồi mong muốn"
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 20,
          default: 8,
          description: "Số lượng mục kinh nghiệm cần trả về"
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
          default: "vi",
          description: "Ngôn ngữ phản hồi mong muốn"
        },
        category: {
          type: "string",
          enum: ["3d-jig", "app-software", "smt-improvement", "ai-iot"],
          description: "Lọc dự án theo danh mục"
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 20,
          default: 8,
          description: "Số lượng dự án cần trả về"
        }
      }
    }
  }
] as const;

function createRpcPayload(id: number, method: string, params?: Record<string, unknown>) {
  return {
    jsonrpc: "2.0",
    id,
    method,
    ...(params ? { params } : {})
  };
}

function createRpcResponse(id: JsonRpcId, result: Record<string, unknown>) {
  return {
    jsonrpc: "2.0",
    id,
    result
  };
}

function createRpcError(id: JsonRpcId, code: number, message: string) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message
    }
  };
}

export function XiaozhiConnector() {
  const wsRef = useRef<Map<string, WebSocket>>(new Map());
  const wsUrlRef = useRef<Map<string, string>>(new Map());
  const idRef = useRef(1);
  const localRobotsLoadedRef = useRef(false);

  const [robots, setRobots] = useState<RobotConfig[]>([]);
  const [runtimes, setRuntimes] = useState<Record<string, RobotRuntime>>({});
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [newRobotName, setNewRobotName] = useState("");
  const [newRobotUrl, setNewRobotUrl] = useState(defaultEndpoint);
  const [syncingRobotId, setSyncingRobotId] = useState<string | null>(null);
  const [contextPreview, setContextPreview] = useState<Record<string, Record<string, unknown>>>({});

  const connectedCount = useMemo(
    () => Object.values(runtimes).filter((runtime) => runtime.state === "connected").length,
    [runtimes]
  );

  function addLog(text: string, level: LogItem["level"] = "info", robotName?: string) {
    const prefix = robotName ? `[${robotName}] ` : "";
    setLogs((prev) => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: `${prefix}${text}`,
        level,
        timestamp: new Date().toLocaleTimeString("vi-VN")
      },
      ...prev
    ]);
  }

  async function callMcp(method: string, params?: Record<string, unknown>) {
    const rpcId = idRef.current++;
    const response = await fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createRpcPayload(rpcId, method, params))
    });

    const payload = (await response.json().catch(() => null)) as RpcResponse | null;
    if (!response.ok || !payload || payload.error) {
      throw new Error(payload?.error?.message || `MCP call failed: ${method}`);
    }

    return payload.result ?? {};
  }

  function sendWsPayload(robotId: string, payload: Record<string, unknown>) {
    const ws = wsRef.current.get(robotId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }

  function updateRuntime(robotId: string, next: Partial<RobotRuntime>) {
    setRuntimes((prev) => {
      const current = prev[robotId] ?? { state: "disconnected", url: "" };
      return {
        ...prev,
        [robotId]: {
          ...current,
          ...next
        }
      };
    });
  }

  async function handleIncomingRpc(robot: RobotConfig, rawText: string) {
    const parsed = JSON.parse(rawText) as WsRpcRequest;
    const method = typeof parsed?.method === "string" ? parsed.method : "";
    const id = parsed?.id ?? null;
    const params = parsed?.params ?? {};

    if (!method) return false;

    if (method === "ping") {
      sendWsPayload(robot.id, createRpcResponse(id, {}));
      addLog("Đã phản hồi ping/pong giữ kết nối.", "success", robot.name);
      return true;
    }

    if (method === "initialize") {
      sendWsPayload(
        robot.id,
        createRpcResponse(id, {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "introducemyself-mcp-bridge",
            version: "1.0.0"
          },
          capabilities: {
            tools: {
              listChanged: false
            }
          }
        })
      );
      addLog("Đã phản hồi initialize cho Xiaozhi.", "success", robot.name);
      return true;
    }

    if (method === "tools/list" || method === "ListToolsRequest") {
      sendWsPayload(
        robot.id,
        createRpcResponse(id, {
          tools: TOOL_DEFINITIONS
        })
      );
      addLog("Đã phản hồi danh sách MCP tools cho Xiaozhi.", "success", robot.name);
      return true;
    }

    if (method === "tools/call" || method === "CallToolRequest") {
      const toolName = typeof params.name === "string" ? params.name : "";
      const toolArgs =
        typeof params.arguments === "object" && params.arguments ? (params.arguments as Record<string, unknown>) : {};

      if (!toolName) {
        sendWsPayload(robot.id, createRpcError(id, -32602, "Invalid params: missing tool name"));
        return true;
      }

      try {
        const result = await callMcp("tools/call", {
          name: toolName,
          arguments: toolArgs
        });

        sendWsPayload(robot.id, createRpcResponse(id, result));
        addLog(`Đã phản hồi tool ${toolName} theo request ID ${String(id)}.`, "success", robot.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : `Tool call failed: ${toolName}`;
        sendWsPayload(robot.id, createRpcError(id, -32000, message));
        addLog(`Lỗi phản hồi tool ${toolName}: ${message}`, "error", robot.name);
      }

      return true;
    }

    return false;
  }

  async function buildMcpContext() {
    await callMcp("initialize", { clientInfo: { name: "xiaozhi-admin-bridge", version: "1.0.0" } });
    await callMcp("tools/list");

    const [profile, journey, projects] = await Promise.all([
      callMcp("tools/call", { name: "thong_tin_ca_nhan", arguments: { lang: "vi" } }),
      callMcp("tools/call", { name: "kinh_nghiem_smt", arguments: { lang: "vi", limit: 10 } }),
      callMcp("tools/call", { name: "danh_sach_du_an", arguments: { lang: "vi", limit: 10 } })
    ]);

    return {
      source: "introducemyself.local.mcp",
      timestamp: new Date().toISOString(),
      profile,
      journey,
      projects
    };
  }

  async function syncContextToRobot(robot: RobotConfig) {
    const ws = wsRef.current.get(robot.id);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog("WebSocket chưa mở. Không thể đồng bộ context.", "error", robot.name);
      return;
    }

    setSyncingRobotId(robot.id);
    try {
      const context = await buildMcpContext();
      setContextPreview((prev) => ({
        ...prev,
        [robot.id]: context
      }));

      ws.send(
        JSON.stringify({
          type: "mcp_context",
          data: context
        })
      );

      addLog("Đã gửi context MCP nội bộ tới Xiaozhi endpoint.", "success", robot.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đồng bộ context";
      addLog(message, "error", robot.name);
    } finally {
      setSyncingRobotId(null);
    }
  }

  function connectRobot(robot: RobotConfig) {
    const target = robot.url.trim();
    if (!target.startsWith("ws://") && !target.startsWith("wss://")) {
      updateRuntime(robot.id, { state: "error", lastError: "URL WebSocket không hợp lệ", url: target });
      addLog("URL WebSocket không hợp lệ. Cần bắt đầu bằng ws:// hoặc wss://.", "error", robot.name);
      return;
    }

    const existing = wsRef.current.get(robot.id);
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    updateRuntime(robot.id, { state: "connecting", lastError: undefined, url: target });
    const ws = new WebSocket(target);
    wsRef.current.set(robot.id, ws);
    wsUrlRef.current.set(robot.id, target);

    ws.onopen = () => {
      updateRuntime(robot.id, { state: "connected", lastError: undefined, url: target });
      addLog("Kết nối WebSocket thành công.", "success", robot.name);
      void syncContextToRobot(robot);
    };

    ws.onmessage = (event) => {
      const text = typeof event.data === "string" ? event.data : "[binary message]";
      addLog(`Robot phản hồi: ${text}`, "info", robot.name);

      if (typeof event.data !== "string") return;

      void (async () => {
        try {
          const handled = await handleIncomingRpc(robot, event.data);
          if (!handled) {
            addLog("Đã nhận message không thuộc luồng JSON-RPC hỗ trợ.", "info", robot.name);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Không xử lý được message từ Xiaozhi";
          addLog(message, "error", robot.name);
        }
      })();
    };

    ws.onerror = () => {
      updateRuntime(robot.id, { state: "error", lastError: "Đã xảy ra lỗi khi kết nối WebSocket.", url: target });
      addLog("Đã xảy ra lỗi khi kết nối WebSocket.", "error", robot.name);
    };

    ws.onclose = () => {
      wsRef.current.delete(robot.id);
       wsUrlRef.current.delete(robot.id);
      updateRuntime(robot.id, { state: "disconnected", url: target });
      addLog("WebSocket đã đóng.", "info", robot.name);
    };
  }

  function disconnectRobot(robotId: string, robotName?: string) {
    const ws = wsRef.current.get(robotId);
    if (ws) {
      ws.close();
      wsRef.current.delete(robotId);
    }
    wsUrlRef.current.delete(robotId);
    updateRuntime(robotId, { state: "disconnected" });
    addLog("Đã ngắt kết nối thủ công.", "info", robotName);
  }

  function addRobot() {
    const name = newRobotName.trim();
    const url = newRobotUrl.trim();
    if (!name || !url) {
      addLog("Cần nhập đủ tên thiết bị và URL WebSocket.", "error");
      return;
    }

    const id = `robot-${Date.now()}`;
    setRobots((prev) => [...prev, { id, name, url, enabled: true }]);
    setNewRobotName("");
    setNewRobotUrl(defaultEndpoint);
  }

  function updateRobot(robotId: string, patch: Partial<RobotConfig>) {
    setRobots((prev) => prev.map((robot) => (robot.id === robotId ? { ...robot, ...patch } : robot)));
  }

  function removeRobot(robotId: string) {
    const robot = robots.find((item) => item.id === robotId);
    disconnectRobot(robotId, robot?.name);
    setRobots((prev) => prev.filter((item) => item.id !== robotId));
    setContextPreview((prev) => {
      const next = { ...prev };
      delete next[robotId];
      return next;
    });
  }

  useEffect(() => {
    const raw = window.localStorage.getItem(ROBOTS_STORAGE_KEY);
    if (!raw) {
      setRobots([
        {
          id: `robot-${Date.now()}`,
          name: "Robot SMT Nhà",
          url: defaultEndpoint,
          enabled: false
        }
      ]);
      localRobotsLoadedRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as RobotConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = parsed
          .filter((item) => item && typeof item.id === "string")
          .map((item) => ({
            id: item.id,
            name: String(item.name ?? "Robot Xiaozhi"),
            url: String(item.url ?? ""),
            enabled: Boolean(item.enabled)
          }));

        setRobots(
          sanitized.length
            ? sanitized
            : [
                {
                  id: `robot-${Date.now()}`,
                  name: "Robot SMT Nhà",
                  url: defaultEndpoint,
                  enabled: false
                }
              ]
        );
      }
    } catch {
      setRobots([
        {
          id: `robot-${Date.now()}`,
          name: "Robot SMT Nhà",
          url: defaultEndpoint,
          enabled: false
        }
      ]);
    }

    localRobotsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!localRobotsLoadedRef.current) return;
    window.localStorage.setItem(ROBOTS_STORAGE_KEY, JSON.stringify(robots));
  }, [robots]);

  useEffect(() => {
    const enabledIds = new Set(robots.filter((robot) => robot.enabled).map((robot) => robot.id));

    wsRef.current.forEach((ws, robotId) => {
      if (!enabledIds.has(robotId)) {
        ws.close();
      }
    });

    robots.forEach((robot) => {
      if (!robot.enabled) return;

      const ws = wsRef.current.get(robot.id);
      if (!ws) {
        connectRobot(robot);
        return;
      }

      const activeUrl = wsUrlRef.current.get(robot.id) ?? "";
      if (activeUrl && activeUrl !== robot.url.trim()) {
        disconnectRobot(robot.id, robot.name);
        connectRobot(robot);
      }
    });
  }, [robots]);

  useEffect(() => {
    return () => {
      wsRef.current.forEach((ws) => ws.close());
      wsRef.current.clear();
      wsUrlRef.current.clear();
    };
  }, []);

  return (
    <section className="space-y-5">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-brand-600 dark:text-brand-300">Xiaozhi MCP Connector</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Kết nối nhiều robot Xiaozhi đồng thời và phản hồi MCP tools theo chuẩn JSON-RPC qua WebSocket.
            </p>
          </div>
          <Link href="/admin" className="rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
            ← Về Dashboard
          </Link>
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trạng thái</p>
          <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-brand-200">
            Đang kết nối: {connectedCount}/{robots.length}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input
            value={newRobotName}
            onChange={(event) => setNewRobotName(event.target.value)}
            placeholder="Tên thiết bị (ví dụ: Robot SMT Nhà)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
          <input
            value={newRobotUrl}
            onChange={(event) => setNewRobotUrl(event.target.value)}
            placeholder="wss://api.xiaozhi.me/mcp/?token=..."
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
          <button type="button" onClick={addRobot} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            Thêm Robot
          </button>
        </div>

        <div className="space-y-3">
          {robots.map((robot) => {
            const runtime = runtimes[robot.id];
            const status = runtime?.state ?? "disconnected";
            const statusText =
              status === "connected"
                ? "Kết nối"
                : status === "connecting"
                  ? "Đang kết nối"
                  : status === "error"
                    ? "Lỗi"
                    : "Ngắt";

            return (
              <div key={robot.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="grid gap-3 lg:grid-cols-[1fr_2fr_auto]">
                  <input
                    value={robot.name}
                    onChange={(event) => updateRobot(robot.id, { name: event.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  />
                  <input
                    value={robot.url}
                    onChange={(event) => updateRobot(robot.id, { url: event.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  />
                  <label className="flex items-center justify-end gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>{robot.enabled ? "Bật" : "Tắt"}</span>
                    <input
                      type="checkbox"
                      checked={robot.enabled}
                      onChange={(event) => updateRobot(robot.id, { enabled: event.target.checked })}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: "var(--border)" }}>
                    Trạng thái: {statusText}
                  </span>
                  {runtime?.lastError && <span className="text-xs text-red-500">{runtime.lastError}</span>}

                  <button
                    type="button"
                    onClick={() => connectRobot(robot)}
                    disabled={!robot.enabled || status === "connecting" || status === "connected"}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Kết nối
                  </button>
                  <button
                    type="button"
                    onClick={() => disconnectRobot(robot.id, robot.name)}
                    disabled={status === "disconnected"}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Ngắt
                  </button>
                  <button
                    type="button"
                    onClick={() => void syncContextToRobot(robot)}
                    disabled={status !== "connected" || syncingRobotId === robot.id}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-brand-700 disabled:opacity-60 dark:text-brand-200"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {syncingRobotId === robot.id ? "Đang đồng bộ..." : "Gửi context"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRobot(robot.id)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-red-500"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Xóa robot
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-base font-semibold text-brand-600 dark:text-brand-300">Nhật ký kết nối</h2>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có sự kiện.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-lg border p-2 text-sm" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{log.timestamp}</p>
                  <p
                    className={
                      log.level === "error"
                        ? "text-red-500"
                        : log.level === "success"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-700 dark:text-slate-200"
                    }
                  >
                    {log.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-brand-600 dark:text-brand-300">MCP Context Preview</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dữ liệu context gần nhất theo từng robot.</p>
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {Object.keys(contextPreview).length ? JSON.stringify(contextPreview, null, 2) : "(chưa có dữ liệu)"}
          </pre>
        </div>
      </div>
    </section>
  );
}
