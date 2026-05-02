// ─── Options Page ─────────────────────────────────────────────────────────────
// Configuration page for MCP servers and other settings

import "~/style.css"
import { useState, useEffect } from "react"

interface MCPConfig {
  url: string
  status: "idle" | "connecting" | "connected" | "error"
  errorMessage?: string
}

export default function OptionsPage() {
  const [mcpServers, setMcpServers] = useState<MCPConfig[]>([])
  const [newServerUrl, setNewServerUrl] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    loadServers()
  }, [])

  async function loadServers() {
    try {
      const servers = await new Promise<string[]>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "LIST_MCP_SERVERS" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(response)
          }
        })
      })
      setMcpServers(servers.map((url) => ({ url, status: "idle" })))
    } catch {
      setMcpServers([])
    }
  }

  async function addServer(e: React.FormEvent) {
    e.preventDefault()
    if (!newServerUrl.trim()) return

    const url = newServerUrl.trim().replace(/\/$/, "") // Remove trailing slash
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setStatusMessage("URL must start with http:// or https://")
      setTimeout(() => setStatusMessage(null), 3000)
      return
    }

    // Check if already exists
    if (mcpServers.some((s) => s.url === url)) {
      setStatusMessage("Server already added")
      setTimeout(() => setStatusMessage(null), 3000)
      return
    }

    const newServer = { url, status: "connecting" as const }
    setMcpServers([...mcpServers, newServer])
    setNewServerUrl("")

    try {
      // Validate server by calling /tools endpoint
      const result = await new Promise<boolean>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "ADD_MCP_SERVER", payload: { url } },
          (_response) => {
            if (chrome.runtime.lastError) {
              resolve(false)
            } else {
              resolve(true)
            }
          }
        )
      })

      if (result) {
        setMcpServers((prev) =>
          prev.map((s) => (s.url === url ? { ...s, status: "connected" } : s))
        )
        setStatusMessage(`Connected to ${url}`)
      } else {
        throw new Error("Failed to connect")
      }
    } catch (err) {
      setMcpServers((prev) =>
        prev.filter((s) => s.url !== url)
      )
      setStatusMessage(`Failed to connect to ${url}: ${err instanceof Error ? err.message : "Unknown error"}`)
    }

    setTimeout(() => setStatusMessage(null), 3000)
  }

  async function removeServer(url: string) {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "REMOVE_MCP_SERVER", payload: { url } },
          (_response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve()
            }
          }
        )
      })

      setMcpServers((prev) => prev.filter((s) => s.url !== url))
      setStatusMessage(`Removed ${url}`)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setStatusMessage(`Failed to remove: ${err instanceof Error ? err.message : "Unknown error"}`)
      setTimeout(() => setStatusMessage(null), 3000)
    }
  }

  async function testServer(server: MCPConfig) {
    // Update status to connecting
    setMcpServers((prev) =>
      prev.map((s) => (s.url === server.url ? { ...s, status: "connecting" } : s))
    )

    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "TEST_MCP_SERVER", payload: { url: server.url } },
          (_response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve()
            }
          }
        )
      })

      setMcpServers((prev) =>
        prev.map((s) => (s.url === server.url ? { ...s, status: "connected" } : s))
      )
      setStatusMessage(`Connected to ${server.url}`)
    } catch (err) {
      setMcpServers((prev) =>
        prev.map((s) => (s.url === server.url ? { ...s, status: "error", errorMessage: err instanceof Error ? err.message : "Connection failed" } : s))
      )
      setStatusMessage(`Failed to connect: ${err instanceof Error ? err.message : "Unknown error"}`)
    }

    setTimeout(() => setStatusMessage(null), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ollama Sidekick Options</h1>

      {/* MCP Servers Configuration */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          MCP Server Configuration
        </h2>

        {/* Add Server Form */}
        <form onSubmit={addServer} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newServerUrl}
            onChange={(e) => setNewServerUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newServerUrl.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Add Server
          </button>
        </form>

        {/* Server List */}
        {mcpServers.length > 0 && (
          <div className="space-y-2">
            {mcpServers.map((server) => (
              <div
                key={server.url}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      server.status === "connected"
                        ? "bg-emerald-500"
                        : server.status === "error"
                        ? "bg-red-500"
                        : server.status === "connecting"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium text-gray-900 truncate">{server.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testServer(server)}
                    disabled={server.status === "connecting"}
                    className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700 disabled:opacity-50"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => removeServer(server.url)}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {mcpServers.length === 0 && (
          <p className="text-gray-500 text-sm">No MCP servers configured. Add one to enable tool calling.</p>
        )}

        {/* Help Text */}
        <div className="mt-4 text-sm text-gray-600">
          <p className="mb-2">
            MCP (Model Context Protocol) servers allow you to add custom tools to Ollama.
            Your local MCP server must expose an HTTP endpoint with SSE support.
          </p>
          <p>
            Common ports: 3000, 3001, 5000. Check your MCP server documentation for the
            correct URL.
          </p>
        </div>
      </section>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg mb-4 ${
            statusMessage.startsWith("Connected") || statusMessage.startsWith("Added") || statusMessage.startsWith("Removed")
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Instructions Section */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-2">Need an MCP Server?</h3>
        <p className="text-sm text-yellow-800 mb-3">
          You can run the reference MCP server or create your own. Check out the
          <a
            href="https://github.com/modelcontextprotocol/spec"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-700 underline ml-1"
          >
            MCP specification
          </a>
          .
        </p>
        <a
          href="https://github.com/modelcontextprotocol/spec#servers"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-yellow-600 text-white text-sm px-3 py-2 rounded hover:bg-yellow-700"
        >
          Learn more about MCP servers
        </a>
      </section>

      {/* Save Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-medium">
          Options saved automatically
        </button>
      </div>
    </div>
  )
}

