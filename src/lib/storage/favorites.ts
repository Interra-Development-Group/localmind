// ─── Favorites Storage ────────────────────────────────────────────────────────
// Manages the user's saved/favorited URLs

const STORAGE_KEY = "favorites"

export interface FavoriteEntry {
  url: string
  title: string
  addedAt: number
}

// ─── Get favorites list ───────────────────────────────────────────────────────

export async function getFavorites(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY] as { url: string; title: string; addedAt: number }[] | undefined

    if (!data) return []
    return data.map((e) => e.url)
  } catch {
    return []
  }
}

// ─── Add a favorite ───────────────────────────────────────────────────────────

export async function addFavorite(url: string, title: string): Promise<FavoriteEntry> {
  const entry: FavoriteEntry = {
    url,
    title,
    addedAt: Date.now()
  }

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY] as FavoriteEntry[] | undefined
    const favorites = data ?? []

    // Check if already exists
    if (favorites.some((f) => f.url === url)) {
      return entry
    }

    favorites.push(entry)
    await chrome.storage.local.set({ [STORAGE_KEY]: favorites })

    return entry
  } catch (e) {
    // Check for quota exceeded
    if (e instanceof Error && e.name === "QuotaExceededError") {
      throw new Error("Storage quota exceeded. Please remove some favorites.")
    }
    throw e
  }
}

// ─── Remove a favorite ────────────────────────────────────────────────────────

export async function removeFavorite(url: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY] as FavoriteEntry[] | undefined

    if (!data) return

    const filtered = data.filter((f) => f.url !== url)

    if (filtered.length === data.length) return

    await chrome.storage.local.set({ [STORAGE_KEY]: filtered })
  } catch {
    // Ignore errors
  }
}

// ─── Check if URL is favorited ────────────────────────────────────────────────

export async function isFavorite(url: string): Promise<boolean> {
  const favorites = await getFavorites()
  return favorites.includes(url)
}

// ─── Get all favorite entries (with metadata) ─────────────────────────────────

export async function getAllFavorites(): Promise<FavoriteEntry[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY] as FavoriteEntry[] | undefined
    return data ?? []
  } catch {
    return []
  }
}
