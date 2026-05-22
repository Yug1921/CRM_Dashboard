import { Badge } from "@/components/ui/badge"
import { scoreVariant } from "@/lib/utils"

export function ScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-text-muted">-</span>
  }

  const rounded = Math.round(score)

  return <Badge variant={scoreVariant(rounded)}>{rounded}</Badge>
}
