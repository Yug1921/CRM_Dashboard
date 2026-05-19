import type { LeadCategory } from "@/types/lead"
import { Badge } from "@/components/ui/badge"
import { categoryLabel } from "@/lib/utils"

const CATEGORY_VARIANTS: Record<LeadCategory, React.ComponentProps<typeof Badge>["variant"]> = {
  crypto: "category-crypto",
  saas: "category-saas",
  real_estate: "category-real-estate",
  ecom: "category-ecom",
  golf_user_org: "category-golf-user-org",
  golf_brand: "category-golf-brand",
  agency: "category-agency",
  media: "category-media",
  travel: "category-travel",
  fitness: "category-fitness",
}

export function CategoryPill({ category }: { category?: LeadCategory | null }) {
  if (!category) {
    return <Badge variant="category-unknown">{categoryLabel(null)}</Badge>
  }

  return <Badge variant={CATEGORY_VARIANTS[category]}>{categoryLabel(category)}</Badge>
}
