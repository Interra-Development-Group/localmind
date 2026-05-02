// ─── Text Chunker ─────────────────────────────────────────────────────────────
// Splits long text into chunks for embedding

export interface ChunkOptions {
  size: number      // Max characters per chunk
  overlap: number   // Overlap between chunks
}

export const textChunker = {
  /**
   * Split text into overlapping chunks
   */
  chunk(text: string, options: ChunkOptions): string[] {
    const { size, overlap } = options
    const chunks: string[] = []

    if (text.length <= size) {
      return [text]
    }

    let start = 0
    while (start < text.length) {
      const end = start + size
      const chunk = text.substring(start, end)

      // Try to break at a sentence boundary
      const lastPeriod = chunk.lastIndexOf(". ")
      const lastNewline = chunk.lastIndexOf("\n")

      if (lastPeriod > size * 0.4) {
        // Break at period within first 40% of chunk
        const breakPoint = lastPeriod + 1
        chunks.push(text.substring(start, breakPoint).trim())
        start = breakPoint - overlap
      } else if (lastNewline > size * 0.4) {
        // Break at newline
        const breakPoint = lastNewline + 1
        chunks.push(text.substring(start, breakPoint).trim())
        start = breakPoint - overlap
      } else {
        // Break at word boundary
        const lastSpace = chunk.lastIndexOf(" ")
        if (lastSpace > size * 0.3) {
          const breakPoint = lastSpace + 1
          chunks.push(text.substring(start, breakPoint).trim())
          start = breakPoint - overlap
        } else {
          // Hard break
          chunks.push(text.substring(start, end).trim())
          start = end - overlap
        }
      }

      // Prevent infinite loop
      if (start < 0) start = 0
      if (end >= text.length) {
        const remaining = text.substring(start).trim()
        if (remaining.length > 10) {
          chunks.push(remaining)
        }
        break
      }
    }

    return chunks
  },

  /**
   * Merge overlapping chunks back together
   */
  merge(chunks: string[]): string {
    if (chunks.length === 0) return ""
    if (chunks.length === 1) return chunks[0]

    // Find overlap between adjacent chunks
    let result = chunks[0]

    for (let i = 1; i < chunks.length; i++) {
      result += " " + chunks[i]
    }

    return result
  },

  /**
   * Get character count across all chunks
   */
  totalLength(chunks: string[]): number {
    return chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  }
}
