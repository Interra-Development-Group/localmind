import { getFavorites } from "~/lib/storage/favorites"
import { getSnapshot, saveSnapshot } from "~/lib/storage/snapshots"
import { createSnapshotFromHtml, fetchPageContent, extractLinks, fetchRobotsTxt, isAllowedByRobots } from "./fetcher"
import { generateSnapshotEmbeddings } from "~/lib/embeddings/index"
import { chat } from "~/lib/ollama/client"
import { CHAT_MODEL } from "~/lib/ollama/models"
import { getEnv } from "~/lib/utils/env"

const CRAWL_INTERVAL_MINUTES = parseInt(getEnv("CRAWL_INTERVAL_MINUTES", "60"), 10)
const MAX_CHILD_LINKS = 10
const ALARM_NAME = "ollama-crawler"

type StatusFn = (url: string, status: "running" | "done" | "error", message?: string) => void

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function initCrawlSchedule(): Promise<void> {
  const alarms = await chrome.alarms.getAll()
  if (!alarms.find((a) => a.name === ALARM_NAME)) {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: CRAWL_INTERVAL_MINUTES,
      delayInMinutes: 1
    })
  }
}

export async function handleCrawlAlarm(
  alarm: chrome.alarms.Alarm,
  onStatus?: StatusFn
): Promise<void> {
  if (alarm.name === ALARM_NAME) await runCrawl(onStatus)
}

// ─── Main crawl entry point ───────────────────────────────────────────────────

export async function runCrawl(onStatus?: StatusFn): Promise<void> {
  const favorites = await getFavorites()

  if (favorites.length === 0) {
    console.log("[Crawler] No favorites to crawl")
    onStatus?.("No favorites", "done", "Nothing to crawl")
    return
  }

  console.log(`[Crawler] Starting crawl: ${favorites.length} favorites`)
  onStatus?.(`Crawling ${favorites.length} pages`, "running")

  let saved = 0
  let failed = 0

  for (const url of favorites) {
    try {
      onStatus?.(url, "running")
      console.log(`[Crawler] Fetching ${url}`)

      const html = await fetchPageContent(url)
      if (!html) {
        console.warn(`[Crawler] Failed to fetch ${url}`)
        onStatus?.(url, "error", "Failed to fetch")
        failed++
        continue
      }

      const snapshot = await createSnapshotFromHtml(url, html)
      console.log(`[Crawler] Parsed ${url}: ${snapshot.wordCount} words, ${snapshot.chunks.length} chunks`)

      if (snapshot.chunks.length === 0) {
        console.warn(`[Crawler] No content extracted from ${url}`)
        onStatus?.(url, "error", "No content found")
        failed++
        continue
      }

      // Embed
      const withEmbeddings = await generateSnapshotEmbeddings({ ...snapshot, depth: 0 })
      const hasEmbeddings = withEmbeddings.embeddings.length > 0
      console.log(`[Crawler] Embeddings for ${url}: ${hasEmbeddings ? withEmbeddings.embeddings.length : "NONE (will retry next crawl)"}`)

      // ── Save immediately — don't block on summary ─────────────────────────
      await saveSnapshot(withEmbeddings)
      saved++
      onStatus?.(url, "done", `${withEmbeddings.wordCount} words${hasEmbeddings ? "" : " (no embeddings)"}`)

      // Generate summary and update record (best-effort, non-blocking save)
      const withSummary = await attachSummary(withEmbeddings)
      if (withSummary.summary) {
        await saveSnapshot(withSummary)
        console.log(`[Crawler] Summary saved for ${url}`)
      }

      // ── Depth-1: crawl same-origin links ──────────────────────────────────
      const links = extractLinks(html, url).slice(0, MAX_CHILD_LINKS)
      console.log(`[Crawler] Found ${links.length} child links on ${url}`)
      if (links.length === 0) continue

      const origin = new URL(url).origin
      const robotsTxt = await fetchRobotsTxt(origin)
      console.log(`[Crawler] robots.txt for ${origin}: ${robotsTxt ? `${robotsTxt.length} bytes` : "empty/not found"}`)

      for (const childUrl of links) {
        const childPath = new URL(childUrl).pathname
        if (!isAllowedByRobots(robotsTxt, childPath)) {
          console.log(`[Crawler] Blocked by robots.txt: ${childUrl}`)
          continue
        }

        const existing = await getSnapshot(childUrl)
        if (existing && Date.now() - existing.crawledAt < 86_400_000) {
          console.log(`[Crawler] Skipping (fresh): ${childUrl}`)
          continue
        }

        try {
          onStatus?.(childUrl, "running")
          console.log(`[Crawler] Fetching child ${childUrl}`)
          const childHtml = await fetchPageContent(childUrl)
          if (!childHtml) { console.warn(`[Crawler] Failed to fetch child ${childUrl}`); continue }

          const childSnap = await createSnapshotFromHtml(childUrl, childHtml)
          console.log(`[Crawler] Child ${childUrl}: ${childSnap.wordCount} words, ${childSnap.chunks.length} chunks`)
          if (childSnap.chunks.length === 0) { console.warn(`[Crawler] No content for child ${childUrl}`); continue }

          const childWithEmbed = await generateSnapshotEmbeddings({ ...childSnap, depth: 1, parentUrl: url })

          // Save before summary
          await saveSnapshot(childWithEmbed)
          saved++
          onStatus?.(childUrl, "done", "discovered")

          const childWithSummary = await attachSummary(childWithEmbed)
          if (childWithSummary.summary) await saveSnapshot(childWithSummary)

          console.log(`[Crawler] Saved child ${childUrl}`)
        } catch (childErr) {
          console.error(`[Crawler] Error on child ${childUrl}:`, childErr)
        }
      }
    } catch (err) {
      console.error(`[Crawler] Error on ${url}:`, err)
      onStatus?.(url, "error", err instanceof Error ? err.message : "Unknown error")
      failed++
    }
  }

  const summary = `${saved} saved${failed > 0 ? `, ${failed} failed` : ""}`
  console.log(`[Crawler] Complete: ${summary}`)
  onStatus?.("Done crawling", "done", summary)
}

// ─── Summary generation ───────────────────────────────────────────────────────

async function attachSummary(snapshot: import("~/types/page").PageSnapshot): Promise<import("~/types/page").PageSnapshot> {
  if (snapshot.summary) return snapshot
  if (snapshot.wordCount < 50) {
    return {
      ...snapshot,
      summary: `⚠ Limited content (${snapshot.wordCount} words) — this page likely requires JavaScript to render.`
    }
  }
  try {
    console.log(`[Crawler] Generating summary for ${snapshot.url}`)
    const response = await chat(CHAT_MODEL, [{
      role: "user",
      content: `In 2-3 sentences, summarize the key topic and information from this web page content. Be concise and factual.\n\n${snapshot.text.substring(0, 1500)}`
    }])
    console.log(`[Crawler] Summary generated for ${snapshot.url}`)
    return { ...snapshot, summary: response.content.trim() }
  } catch (err) {
    console.warn(`[Crawler] Summary failed for ${snapshot.url}:`, err)
    return snapshot
  }
}
