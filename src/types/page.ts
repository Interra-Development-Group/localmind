// ─── Page Content Types ───────────────────────────────────────────────────────

export interface PageSnapshot {
  id: string        // url (primary key)
  url: string
  title: string
  text: string      // full extracted text
  chunks: string[]  // chunked text segments
  embeddings: number[][]  // one embedding vector per chunk
  crawledAt: number // Date.now()
  wordCount: number
}

export interface PageContent {
  url: string
  title: string
  text: string
  selection: string
}
