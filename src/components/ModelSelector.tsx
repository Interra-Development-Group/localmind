// ─── Model Selector Component ─────────────────────────────────────────────────

interface ModelSelectorProps {
  availableModels: string[]
  selectedModel: string
  onSelect: (model: string) => void
}

const EMBED_PATTERNS = ["embed", "minilm", "arctic-embed", "e5-"]

function isEmbedModel(name: string): boolean {
  const lower = name.toLowerCase()
  return EMBED_PATTERNS.some((p) => lower.includes(p))
}

export function ModelSelector({ availableModels, selectedModel, onSelect }: ModelSelectorProps) {
  const all = availableModels.length > 0 ? availableModels : [selectedModel]
  const models = all.filter((m) => !isEmbedModel(m))
  // If the currently selected model got filtered out, keep it in the list
  if (!models.includes(selectedModel)) models.unshift(selectedModel)

  return (
    <div className="relative">
      <select
        value={selectedModel}
        onChange={(e) => onSelect(e.target.value)}
        className="appearance-none bg-white/10 hover:bg-white/20 text-white text-xs font-medium pl-2.5 pr-6 py-1.5 rounded-md border border-white/20 cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
      >
        {models.map((model) => (
          <option key={model} value={model} className="bg-slate-800 text-white">
            {model}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
        <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
