import { db } from "@/db";
import { recipes, labels } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { BookOpen, Tag, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ManageDashboard() {
  const [[{ recipeCount }], [{ labelCount }], [{ draftCount }]] =
    await Promise.all([
      db.select({ recipeCount: count() }).from(recipes).where(eq(recipes.isPublished, true)),
      db.select({ labelCount: count() }).from(labels),
      db.select({ draftCount: count() }).from(recipes).where(eq(recipes.isPublished, false)),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Manage your recipes and labels.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Published recipes", value: recipeCount, icon: BookOpen },
          { label: "Draft recipes", value: draftCount, icon: BookOpen },
          { label: "Labels", value: labelCount, icon: Tag },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">{label}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/manage/recipes/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New recipe
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/manage/labels">Manage labels</Link>
        </Button>
      </div>
    </div>
  );
}
