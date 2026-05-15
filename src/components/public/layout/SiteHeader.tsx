import Link from "next/link";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { MobileNav } from "./MobileNav";

export async function SiteHeader() {
  const allLabels = await db
    .select()
    .from(labels)
    .where(eq(labels.showInNav, true))
    .orderBy(asc(labels.sortOrder), asc(labels.name));

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2 flex-shrink-0">
          <span className="font-serif text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            Lightly Sweetened
          </span>
        </Link>

        <nav aria-label="Site navigation" className="hidden lg:flex items-center gap-6">
          <Link
            href="/recipes"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            All Recipes
          </Link>
        </nav>

        <MobileNav labels={allLabels} />
      </div>
    </header>
  );
}
