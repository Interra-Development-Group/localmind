// ─── Crawler Scheduler ────────────────────────────────────────────────────────
// Uses Chrome Alarms API to schedule crawling of favorites

import { getFavorites } from "~/lib/storage/favorites"
import { createSnapshotFromHtml } from "./fetcher"
import { generateSnapshotEmbeddings } from "~/lib/embeddings/index"
import { saveSnapshot } from "~/lib/storage/snapshots"
import { getEnv } from "~/lib/utils/env"

const CRAWL_INTERVAL_MINUTES = parseInt(getEnv("CRAWL_INTERVAL_MINUTES", "60"), 10)

const ALARM_NAME = "ollama-crawler"

// ─── Initialize crawl schedule ────────────────────────────────────────────────

export async function initCrawlSchedule(): Promise<void> {
  const interval = getIntervalMinutes()

  // Check if alarm already exists
  const alarms = await chrome.alarms.getAll()
  const existingAlarm = alarms.find((a) => a.name === ALARM_NAME)

  if (!existingAlarm) {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: interval,
      delayInMinutes: 1 // Start after 1 minute on install
    })
  }
}

// ─── Get configured crawl interval ────────────────────────────────────────────

function getIntervalMinutes(): number {
  // Read from storage first (user override), then env var, then default
  return CRAWL_INTERVAL_MINUTES
}

// ─── Handle alarm trigger ─────────────────────────────────────────────────────

export async function handleCrawlAlarm(
  alarm: chrome.alarms.Alarm,
  onStatus?: (url: string, status: "running" | "done" | "error", message?: string) => void
): Promise<void> {
  if (alarm.name !== ALARM_NAME) return

  await runCrawl(onStatus)
}

// ─── Run crawl for all favorites ──────────────────────────────────────────────

export async function runCrawl(
  onStatus?: (url: string, status: "running" | "done" | "error", message?: string) => void
): Promise<void> {
  const favorites = await getFavorites()

  if (favorites.length === 0) {
    onStatus?.("No favorites", "done", "Nothing to crawl")
    return
  }

  onStatus?.(`Crawling ${favorites.length} pages`, "running")

  for (const url of favorites) {
    try {
      onStatus?.(url, "running")

      // Fetch page
      const html = await fetchPageContent(url)
      if (!html) {
        onStatus?.(url, "error", "Failed to fetch page")
        continue
      }

      // Parse and create snapshot
      const snapshot = await createSnapshotFromHtml(url, html)

      if (snapshot.chunks.length === 0) {
        onStatus?.(url, "error", "No content found")
        continue
      }

      // Generate embeddings
      const fullSnapshot = await generateSnapshotEmbeddings(snapshot)

      // Save to IndexedDB
      await saveSnapshot(fullSnapshot)

      onStatus?.(url, "done", `Crawled ${fullSnapshot.wordCount} words`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      onStatus?.(url, "error", message)
    }
  }

  onStatus?.(`Done crawling`, "done", "")
}

// ─── Helper: Fetch page content ───────────────────────────────────────────────

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Ollama-Sidekick-Crawler/1.0"
      }
    })

    if (!res.ok) {
      return null
    }

    return await res.text()
  } catch {
    return null
  }
}

// ─── Trigger manual crawl ─────────────────────────────────────────────────────

export async function triggerCrawl(): Promise<void> {
  // This is called from background worker - just trigger alarm immediately
  chrome.alarms.create(`${ALARM_NAME}-manual`, {
    when: Date.now() + 1000 // Run in 1 second
  })
}
