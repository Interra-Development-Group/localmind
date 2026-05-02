// ─── Favorites Hook ───────────────────────────────────────────────────────────
// Manages favorite URLs for crawling

import { useState, useEffect } from "react"

export interface FavoritesState {
  urls: string[]
  loading: boolean
  error: string | null
}

export interface UseFavoritesReturn {
  state: FavoritesState
  addFavorite: (url: string, title: string) => Promise<void>
  removeFavorite: (url: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useFavorites(): UseFavoritesReturn {
  const [state, setState] = useState<FavoritesState>({
    urls: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    refresh()
  }, [])

  async function refresh(): Promise<void> {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const result = await new Promise<string[]>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "GET_FAVORITES" }, (response: any) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(response.payload)
          }
        })
      })

      setState({ urls: result, loading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load favorites"
      }))
    }
  }

  async function addFavorite(url: string, title: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "ADD_FAVORITE", payload: { url, title } },
          (_response: any) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve()
            }
          }
        )
      })

      await refresh()
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to add favorite"
      }))
    }
  }

  async function removeFavorite(url: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "REMOVE_FAVORITE", payload: { url } },
          (_response: any) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve()
            }
          }
        )
      })

      await refresh()
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to remove favorite"
      }))
    }
  }

  return {
    state,
    addFavorite,
    removeFavorite,
    refresh
  }
}
