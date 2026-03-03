import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold text-foreground tracking-tight">
            Lightly Sweetened
          </span>
        </Link>

        <nav aria-label="Site navigation" className="flex items-center gap-6">
          <Link
            href="/recipes"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            All Recipes
          </Link>
        </nav>
      </div>
    </header>
  );
}
