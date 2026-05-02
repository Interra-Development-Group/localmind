// ─── IndexedDB Setup ──────────────────────────────────────────────────────────
// Provides a simple wrapper around IndexedDB using the `idb` library

// ─── IndexedDB Setup ──────────────────────────────────────────────────────────
// Provides a simple wrapper around IndexedDB using the `idb` library

import type { IDBPDatabase } from "idb"
import { openDB } from "idb"

// ─── DB Schema ────────────────────────────────────────────────────────────────

interface DatabaseSchema {
  snapshots: string | IDBValidKey
  favorites: string | IDBValidKey
}

const DB_NAME = "ollama-sidekick"
const DB_VERSION = 1

export type AppDatabase = IDBPDatabase<DatabaseSchema>

export async function getDb(): Promise<AppDatabase> {
  return openDB<DatabaseSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Snapshots store (for crawled page data with embeddings)
      if (!db.objectStoreNames.contains("snapshots")) {
        const snapshotsStore = db.createObjectStore("snapshots", { keyPath: "id" })
        snapshotsStore.createIndex("url", "url")
        snapshotsStore.createIndex("crawledAt", "crawledAt")
      }

      // Favorites store (simple string array as object store)
      if (!db.objectStoreNames.contains("favorites")) {
        db.createObjectStore("favorites", { keyPath: "url" })
      }
    }
  })
}

// ─── Cleanup helper ───────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["snapshots", "favorites"] as any, "readwrite")
  await (tx.objectStore("snapshots" as any) as any).clear()
  await (tx.objectStore("favorites" as any) as any).clear()
  await tx.done
}
