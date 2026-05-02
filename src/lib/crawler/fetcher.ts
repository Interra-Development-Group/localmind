// ─── Page Fetcher and Parser ──────────────────────────────────────────────────
// Fetches HTML pages and extracts text content

import { domParser } from "~/utils/domParser"
import { textChunker } from "~/utils/textChunker"
import { PAGE_TEXT_MAX_CHARS } from "~/lib/ollama/models"
import type { PageSnapshot } from "~/types/page"

// ─── Fetch page content ───────────────────────────────────────────────────────

export async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Ollama-Sidekick-Crawler/1.0",
        "Accept": "text/html,application/xhtml+xml"
      }
    })

    if (!res.ok) {
      console.warn(`[Fetcher] Failed to fetch ${url}: ${res.status}`)
      return null
    }

    return await res.text()
  } catch (err) {
    console.error(`[Fetcher] Error fetching ${url}:`, err)
    return null
  }
}

// ─── Parse HTML and create snapshot ───────────────────────────────────────────

export async function createSnapshotFromHtml(
  url: string,
  html: string
): Promise<PageSnapshot> {
  // Extract text from HTML
  const text = domParser.extractText(html)

  // Truncate if too long
  const truncatedText =
    text.length > PAGE_TEXT_MAX_CHARS
      ? text.substring(0, PAGE_TEXT_MAX_CHARS)
      : text

  // Get title from document
  const title = domParser.extractTitle(html) || new URL(url).hostname

  // Chunk the text
  const chunks = textChunker.chunk(truncatedText, {
    size: parseInt(process.env.PLASMO_PUBLIC_CHUNK_SIZE ?? "500", 10),
    overlap: parseInt(process.env.PLASMO_PUBLIC_CHUNK_OVERLAP ?? "50", 10)
  })

  // Count words (simple approximation)
  const wordCount = truncatedText.trim().split(/\s+/).length

  return {
    id: url,
    url,
    title,
    text: truncatedText,
    chunks,
    embeddings: [],
    crawledAt: Date.now(),
    wordCount
  }
}

// ─── Parse HTML directly (for content script) ────────────────────────────────

export function parsePageFromDocument(doc: Document): {
  url: string
  title: string
  text: string
} {
  const text = domParser.extractTextFromDocument(doc)
  const title = doc.title || new URL(location.href).hostname

  return {
    url: location.href,
    title,
    text
  }
}
