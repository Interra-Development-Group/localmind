// ─── Embedding Generation ─────────────────────────────────────────────────────
// Uses Ollama to generate embeddings for text chunks

import { generateEmbeddings } from "~/lib/ollama/client"
import { EMBED_MODEL } from "~/lib/ollama/models"
import type { PageSnapshot } from "~/types/page"

// ─── Generate embeddings for a text chunk ─────────────────────────────────────

export async function generateChunkEmbedding(chunk: string): Promise<number[]> {
  const embeddings = await generateEmbeddings(EMBED_MODEL, [chunk])
  return embeddings[0]
}

// ─── Generate embeddings for all chunks in a snapshot ─────────────────────────

export async function generateSnapshotEmbeddings(snapshot: PageSnapshot): Promise<PageSnapshot> {
  if (snapshot.chunks.length === 0) {
    return snapshot
  }

  try {
    const embeddings = await generateChunkEmbeddings(snapshot.chunks)
    return { ...snapshot, embeddings }
  } catch (err) {
    console.error("[Embeddings] Failed to generate embeddings:", err)
    throw err
  }
}

// ─── Batch generate embeddings ────────────────────────────────────────────────

export async function generateChunkEmbeddings(chunks: string[]): Promise<number[][]> {
  // Ollama accepts multiple prompts in one call
  return generateEmbeddings(EMBED_MODEL, chunks)
}

// ─── Convenience: generate embeddings for text directly ───────────────────────

export async function generateEmbeddingsForText(text: string): Promise<number[][]> {
  // Simple chunking - 1000 characters per chunk
  const chunkSize = 1000
  const chunks: string[] = []

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize))
  }

  return generateChunkEmbeddings(chunks)
}
