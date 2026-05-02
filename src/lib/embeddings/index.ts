import { generateEmbeddings } from "~/lib/ollama/client"
import { EMBED_MODEL } from "~/lib/ollama/models"
import type { PageSnapshot } from "~/types/page"

export async function generateChunkEmbedding(chunk: string): Promise<number[]> {
  const embeddings = await generateEmbeddings(EMBED_MODEL, [chunk])
  return embeddings[0]
}

export async function generateSnapshotEmbeddings(snapshot: PageSnapshot): Promise<PageSnapshot> {
  if (snapshot.chunks.length === 0) {
    console.log(`[Embeddings] No chunks for ${snapshot.url} — skipping`)
    return snapshot
  }

  const start = Date.now()
  console.log(`[Embeddings] Generating for ${snapshot.url}: ${snapshot.chunks.length} chunks via ${EMBED_MODEL}`)

  try {
    const embeddings = await generateChunkEmbeddings(snapshot.chunks)
    console.log(`[Embeddings] Done in ${Date.now() - start}ms — ${embeddings.length} vectors, dim=${embeddings[0]?.length ?? 0}`)
    return { ...snapshot, embeddings }
  } catch (err) {
    // Non-fatal: save snapshot without embeddings so the record isn't lost.
    // On next crawl, embeddings will be regenerated.
    console.error(`[Embeddings] FAILED for ${snapshot.url}:`, err)
    return { ...snapshot, embeddings: [] }
  }
}

export async function generateChunkEmbeddings(chunks: string[]): Promise<number[][]> {
  return generateEmbeddings(EMBED_MODEL, chunks)
}

export async function generateEmbeddingsForText(text: string): Promise<number[][]> {
  const chunkSize = 1000
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize))
  }
  return generateChunkEmbeddings(chunks)
}
