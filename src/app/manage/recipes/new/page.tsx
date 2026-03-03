import { db } from "@/db";
import { labels } from "@/db/schema";
import { asc } from "drizzle-orm";
import { RecipeForm } from "@/components/admin/recipe/RecipeForm";

export default async function NewRecipePage() {
  const allLabels = await db.select().from(labels).orderBy(asc(labels.sortOrder));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">New recipe</h1>
        <p className="mt-1 text-muted-foreground">
          Import from a URL, paste your ingredients, or fill in manually.
        </p>
      </div>
      <RecipeForm allLabels={allLabels} />
    </div>
  );
}
