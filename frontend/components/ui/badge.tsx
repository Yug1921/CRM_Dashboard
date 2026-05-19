import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "category-crypto":
          "border-[var(--cat-crypto-border)] bg-[var(--cat-crypto-bg)] text-[var(--cat-crypto-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-saas":
          "border-[var(--cat-saas-border)] bg-[var(--cat-saas-bg)] text-[var(--cat-saas-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-real-estate":
          "border-[var(--cat-real-estate-border)] bg-[var(--cat-real-estate-bg)] text-[var(--cat-real-estate-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-ecom":
          "border-[var(--cat-ecom-border)] bg-[var(--cat-ecom-bg)] text-[var(--cat-ecom-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-golf-user-org":
          "border-[var(--cat-golf-user-org-border)] bg-[var(--cat-golf-user-org-bg)] text-[var(--cat-golf-user-org-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-golf-brand":
          "border-[var(--cat-golf-brand-border)] bg-[var(--cat-golf-brand-bg)] text-[var(--cat-golf-brand-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-agency":
          "border-[var(--cat-agency-border)] bg-[var(--cat-agency-bg)] text-[var(--cat-agency-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-media":
          "border-[var(--cat-media-border)] bg-[var(--cat-media-bg)] text-[var(--cat-media-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-travel":
          "border-[var(--cat-travel-border)] bg-[var(--cat-travel-bg)] text-[var(--cat-travel-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-fitness":
          "border-[var(--cat-fitness-border)] bg-[var(--cat-fitness-bg)] text-[var(--cat-fitness-text)] uppercase tracking-[0.6px] text-[10px]",
        "category-unknown":
          "border-[var(--cat-unknown-border)] bg-[var(--cat-unknown-bg)] text-[var(--cat-unknown-text)] uppercase tracking-[0.6px] text-[10px]",
        "status-new":
          "border-[var(--status-new-border)] bg-[var(--status-new-bg)] text-[var(--status-new-text)]",
        "status-engaged":
          "border-[var(--status-engaged-border)] bg-[var(--status-engaged-bg)] text-[var(--status-engaged-text)]",
        "status-contacted":
          "border-[var(--status-contacted-border)] bg-[var(--status-contacted-bg)] text-[var(--status-contacted-text)]",
        "status-replied":
          "border-[var(--status-replied-border)] bg-[var(--status-replied-bg)] text-[var(--status-replied-text)]",
        "status-qualified":
          "border-[var(--status-qualified-border)] bg-[var(--status-qualified-bg)] text-[var(--status-qualified-text)]",
        "status-unqualified":
          "border-[var(--status-unqualified-border)] bg-[var(--status-unqualified-bg)] text-[var(--status-unqualified-text)]",
        "status-do-not-contact":
          "border-[var(--status-do-not-contact-border)] bg-[var(--status-do-not-contact-bg)] text-[var(--status-do-not-contact-text)]",
        "score-low":
          "relative pl-3 font-mono border-transparent bg-[var(--score-low-bg)] text-[var(--score-low-text)] before:absolute before:left-2 before:top-1/2 before:h-2 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-[var(--score-low-text)]",
        "score-medium":
          "relative pl-3 font-mono border-transparent bg-[var(--score-medium-bg)] text-[var(--score-medium-text)] before:absolute before:left-2 before:top-1/2 before:h-2 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-[var(--score-medium-text)]",
        "score-high":
          "relative pl-3 font-mono border-transparent bg-[var(--score-high-bg)] text-[var(--score-high-text)] before:absolute before:left-2 before:top-1/2 before:h-2 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-[var(--score-high-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
