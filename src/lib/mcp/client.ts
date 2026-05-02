// ─── SSE-based MCP Client ────────────────────────────────────────────────────
// Browser extensions cannot use stdio transport. All MCP servers must expose
// an HTTP/SSE interface. Each MCPClient instance talks to one server base URL.
//
// Expected server endpoints:
//   GET  /tools              → MCPToolSchema[]
//   POST /tools/:name        → { result: unknown }
//   GET  /tools/:name/stream → SSE stream of { chunk: string, done: boolean }

import type { MCPToolSchema } from "./types"

export interface MCPToolResult {
  result: unknown
  error?: string
}

export class MCPClient {
  private toolCache: MCPToolSchema[] | null = null

  constructor(public readonly baseUrl: string) {}

  // ─── List all tools exposed by this server ─────────────────────────────────

  async listTools(forceRefresh = false): Promise<MCPToolSchema[]> {
    if (this.toolCache && !forceRefresh) return this.toolCache

    const res = await fetch(`${this.baseUrl}/tools`, {
      headers: { Accept: "application/json" }
    })

    if (!res.ok) {
      throw new MCPError(`Failed to list tools from ${this.baseUrl}`, res.status)
    }

    const tools: Omit<MCPToolSchema, "serverUrl">[] = await res.json()

    // Attach the serverUrl so the background worker knows where to route calls
    this.toolCache = tools.map((t) => ({ ...t, serverUrl: this.baseUrl }))
    return this.toolCache
  }

  // ─── Call a tool and wait for the full result ──────────────────────────────

  async callTool(toolName: string, args: unknown): Promise<MCPToolResult> {
    const res = await fetch(`${this.baseUrl}/tools/${encodeURIComponent(toolName)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args)
    })

    if (!res.ok) {
      const text = await res.text()
      return { result: null, error: `MCP tool error (${res.status}): ${text}` }
    }

    return res.json()
  }

  // ─── Call a tool with streaming response ───────────────────────────────────
  // Returns an EventSource. Caller must call es.close() when done.
  // Each SSE event carries: { chunk: string, done: boolean }

  streamTool(
    toolName: string,
    args: unknown,
    onChunk: (chunk: string, done: boolean) => void
  ): EventSource {
    const url = new URL(`${this.baseUrl}/tools/${encodeURIComponent(toolName)}/stream`)
    url.searchParams.set("args", JSON.stringify(args))

    const es = new EventSource(url.toString())

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { chunk: string; done: boolean }
        onChunk(data.chunk, data.done)
        if (data.done) es.close()
      } catch {
        // Malformed event — ignore
      }
    }

    es.onerror = () => {
      onChunk("", true)
      es.close()
    }

    return es
  }

  // ─── Health check ──────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/tools`, { method: "HEAD" })
      return res.ok
    } catch {
      return false
    }
  }

  invalidateCache(): void {
    this.toolCache = null
  }
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class MCPError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = "MCPError"
  }
}
