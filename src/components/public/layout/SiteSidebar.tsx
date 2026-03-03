import Link from "next/link";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function SiteSidebar() {
  const allLabels = await db
    .select()
    .from(labels)
    .orderBy(asc(labels.sortOrder), asc(labels.name));

  return (
    <aside className="w-56 shrink-0">
      <nav aria-label="Recipe categories">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Browse
        </p>
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/recipes"
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              All Recipes
            </Link>
          </li>
          {allLabels.map((label) => (
            <li key={label.id}>
              <Link
                href={`/label/${label.slug}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {label.color && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                    aria-hidden="true"
                  />
                )}
                {label.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
