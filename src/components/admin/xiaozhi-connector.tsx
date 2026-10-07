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

const defaultEndpoint = "wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN";

const TOOL_DEFINITIONS = [
  {
    name: "get_personal_info",
    description: "Lấy thông tin cá nhân, mục tiêu, kỹ năng chính của Nguyễn Văn Thạnh",
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
    name: "get_smt_experience",
    description: "Lấy quá trình làm việc, kinh nghiệm lập trình SMT, cân bằng chuyền (Line balance) và thiết bị xưởng",
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
    name: "get_projects",
    description: "Lấy danh sách các dự án thực tế và sản phẩm tiêu biểu",
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
  const wsRef = useRef<WebSocket | null>(null);
  const idRef = useRef(1);

  const [endpoint, setEndpoint] = useState(defaultEndpoint);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [contextPreview, setContextPreview] = useState<Record<string, unknown> | null>(null);

  const statusLabel = useMemo(() => {
    if (connectionState === "connected") return "Đã kết nối";
    if (connectionState === "connecting") return "Đang kết nối";
    if (connectionState === "error") return "Lỗi kết nối";
    return "Chưa kết nối";
  }, [connectionState]);

  function addLog(text: string, level: LogItem["level"] = "info") {
    setLogs((prev) => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text,
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

  function sendWsPayload(payload: Record<string, unknown>) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(payload));
  }

  async function handleIncomingRpc(rawText: string) {
    const parsed = JSON.parse(rawText) as WsRpcRequest;
    const method = typeof parsed?.method === "string" ? parsed.method : "";
    const id = parsed?.id ?? null;
    const params = parsed?.params ?? {};

    if (!method) return false;

    if (method === "initialize") {
      sendWsPayload(
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
      addLog("Đã phản hồi initialize cho Xiaozhi.", "success");
      return true;
    }

    if (method === "tools/list" || method === "ListToolsRequest") {
      sendWsPayload(
        createRpcResponse(id, {
          tools: TOOL_DEFINITIONS
        })
      );
      addLog("Đã phản hồi danh sách MCP tools cho Xiaozhi.", "success");
      return true;
    }

    if (method === "tools/call" || method === "CallToolRequest") {
      const toolName = typeof params.name === "string" ? params.name : "";
      const toolArgs =
        typeof params.arguments === "object" && params.arguments ? (params.arguments as Record<string, unknown>) : {};

      if (!toolName) {
        sendWsPayload(createRpcError(id, -32602, "Invalid params: missing tool name"));
        return true;
      }

      try {
        const result = await callMcp("tools/call", {
          name: toolName,
          arguments: toolArgs
        });

        sendWsPayload(createRpcResponse(id, result));
        addLog(`Đã phản hồi tool ${toolName} theo request ID ${String(id)}.`, "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : `Tool call failed: ${toolName}`;
        sendWsPayload(createRpcError(id, -32000, message));
        addLog(`Lỗi phản hồi tool ${toolName}: ${message}`, "error");
      }

      return true;
    }

    return false;
  }

  async function buildMcpContext() {
    await callMcp("initialize", { clientInfo: { name: "xiaozhi-admin-bridge", version: "1.0.0" } });
    await callMcp("tools/list");

    const [profile, journey, projects] = await Promise.all([
      callMcp("tools/call", { name: "get_personal_info", arguments: { lang: "vi" } }),
      callMcp("tools/call", { name: "get_smt_experience", arguments: { lang: "vi", limit: 10 } }),
      callMcp("tools/call", { name: "get_projects", arguments: { lang: "vi", limit: 10 } })
    ]);

    return {
      source: "introducemyself.local.mcp",
      timestamp: new Date().toISOString(),
      profile,
      journey,
      projects
    };
  }

  async function syncContextToRobot() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog("WebSocket chưa mở. Không thể đồng bộ context.", "error");
      return;
    }

    setIsSyncing(true);
    try {
      const context = await buildMcpContext();
      setContextPreview(context);

      wsRef.current.send(
        JSON.stringify({
          type: "mcp_context",
          data: context
        })
      );

      addLog("Đã gửi context MCP nội bộ tới Xiaozhi endpoint.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đồng bộ context";
      addLog(message, "error");
    } finally {
      setIsSyncing(false);
    }
  }

  function connect() {
    const target = endpoint.trim();
    if (!target.startsWith("ws://") && !target.startsWith("wss://")) {
      addLog("URL WebSocket không hợp lệ. Cần bắt đầu bằng ws:// hoặc wss://.", "error");
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      addLog("Đang có kết nối hoạt động. Hãy ngắt trước khi kết nối lại.");
      return;
    }

    setConnectionState("connecting");
    const ws = new WebSocket(target);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState("connected");
      addLog("Kết nối WebSocket thành công.", "success");
      void syncContextToRobot();
    };

    ws.onmessage = (event) => {
      const text = typeof event.data === "string" ? event.data : "[binary message]";
      addLog(`Robot phản hồi: ${text}`);

      if (typeof event.data !== "string") return;

      void (async () => {
        try {
          const handled = await handleIncomingRpc(event.data);
          if (!handled) {
            addLog("Đã nhận message không thuộc luồng JSON-RPC tools/list-tools/call.");
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Không xử lý được message từ Xiaozhi";
          addLog(message, "error");
        }
      })();
    };

    ws.onerror = () => {
      setConnectionState("error");
      addLog("Đã xảy ra lỗi khi kết nối WebSocket.", "error");
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      addLog("WebSocket đã đóng.");
    };
  }

  function disconnect() {
    if (!wsRef.current) return;
    wsRef.current.close();
    wsRef.current = null;
    setConnectionState("disconnected");
    addLog("Đã ngắt kết nối thủ công.");
  }

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <section className="space-y-5">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-brand-600 dark:text-brand-300">Xiaozhi MCP Connector</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Kết nối trực tiếp robot Xiaozhi và đẩy context nội bộ từ endpoint MCP của chính dự án.
            </p>
          </div>
          <Link href="/admin" className="rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
            ← Về Dashboard
          </Link>
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trạng thái</p>
          <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-brand-200">{statusLabel}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="wss://api.xiaozhi.me/mcp/?token=..."
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />

          <button
            type="button"
            onClick={connect}
            disabled={connectionState === "connecting" || connectionState === "connected"}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Kết nối
          </button>

          <button
            type="button"
            onClick={disconnect}
            disabled={connectionState === "disconnected"}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:text-slate-200"
            style={{ borderColor: "var(--border)" }}
          >
            Ngắt kết nối
          </button>

          <button
            type="button"
            onClick={() => void syncContextToRobot()}
            disabled={connectionState !== "connected" || isSyncing}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60 dark:text-brand-200"
            style={{ borderColor: "var(--border)" }}
          >
            {isSyncing ? "Đang đồng bộ..." : "Gửi lại context"}
          </button>
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dữ liệu lấy từ /api/mcp trước khi gửi qua WebSocket.</p>
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {contextPreview ? JSON.stringify(contextPreview, null, 2) : "(chưa có dữ liệu)"}
          </pre>
        </div>
      </div>
    </section>
  );
}
