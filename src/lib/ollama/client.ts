// ─── Ollama REST API Client ───────────────────────────────────────────────────
// Communicates with local Ollama instance for chat and embeddings

import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaEmbedRequest,
  OllamaEmbedResponse,
  OllamaListModelsResponse,
  OllamaMessage,
  OllamaToolDefinition
} from "./types"

import { OLLAMA_BASE_URL } from "./models"
import type { OllamaModel } from "./types"

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<"connected" | "disconnected" | "cors_error" | "not_found"> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { method: "HEAD" })

    if (res.status === 403) {
      return "cors_error"
    }
    if (res.status === 404) {
      return "not_found"
    }
    if (!res.ok) {
      return "disconnected"
    }
    return "connected"
  } catch {
    return "disconnected"
  }
}

// ─── List Available Models ────────────────────────────────────────────────────

export async function listModels(): Promise<OllamaModel[]> {
  console.log(`[Ollama] GET ${OLLAMA_BASE_URL}/api/tags`)
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`)

  if (!res.ok) {
    throw new Error(`Failed to list models: ${res.statusText}`)
  }

  const data: OllamaListModelsResponse = await res.json()
  console.log(`[Ollama] Models: ${data.models.map((m) => m.name).join(", ")}`)
  return data.models
}

// ─── Chat Completion (Streaming) ──────────────────────────────────────────────

export async function* streamChat(
  model: string,
  messages: OllamaMessage[],
  tools?: OllamaToolDefinition[]
): AsyncGenerator<OllamaChatResponse, void, unknown> {
  const request: OllamaChatRequest = {
    model,
    messages,
    stream: true,
    tools
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama chat failed: ${res.status} ${text}`)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error("Response body is not readable")
  }

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split("\n").filter((line) => line.trim())

    for (const line of lines) {
      try {
        const data: OllamaChatResponse = JSON.parse(line)

        // Handle errors in the message if present
        if (data.message?.content?.includes?.("error")) {
          throw new Error(data.message.content)
        }

        yield data
      } catch {
        // Skip malformed lines
      }
    }
  }
}

// ─── Non-Streaming Chat (for tool call responses) ─────────────────────────────

export async function chat(
  model: string,
  messages: OllamaMessage[],
  tools?: OllamaToolDefinition[]
): Promise<OllamaMessage> {
  const request: OllamaChatRequest = {
    model,
    messages,
    stream: false,
    tools
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama chat failed: ${res.status} ${text}`)
  }

  const data: OllamaChatResponse = await res.json()
  return data.message
}

// ─── Generate Embeddings ──────────────────────────────────────────────────────
// Uses /api/embed (batch endpoint) — accepts an array, returns array of arrays.

export async function generateEmbeddings(model: string, inputs: string[]): Promise<number[][]> {
  const request: OllamaEmbedRequest = { model, input: inputs }
  console.log(`[Ollama] POST /api/embed model=${model} inputs=${inputs.length}`)

  const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Ollama] /api/embed failed: ${res.status} ${text}`)
    throw new Error(`Ollama embeddings failed: ${res.status} ${text}`)
  }

  const data: OllamaEmbedResponse = await res.json()
  console.log(`[Ollama] /api/embed returned ${data.embeddings.length} vectors`)
  return data.embeddings
}

// ─── Generate Single Embedding (convenience) ──────────────────────────────────

export async function generateEmbedding(model: string, input: string): Promise<number[]> {
  const embeddings = await generateEmbeddings(model, [input])
  return embeddings[0]
}
