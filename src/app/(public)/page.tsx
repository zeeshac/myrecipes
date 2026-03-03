import { db } from "@/db";
import { recipes, recipeLabels, labels } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { RecipeGrid } from "@/components/public/recipe/RecipeGrid";

export const revalidate = 60;

export default async function HomePage() {
  const recentRecipes = await db.query.recipes.findMany({
    where: eq(recipes.isPublished, true),
    orderBy: [desc(recipes.publishedAt)],
    limit: 12,
    with: {
      recipeLabels: {
        with: { label: true },
      },
    },
  });

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="space-y-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Welcome to the kitchen
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          A personal collection of recipes — from weeknight dinners to weekend
          baking projects.
        </p>
      </div>

      {/* Recipe grid */}
      {recentRecipes.length > 0 ? (
        <RecipeGrid recipes={recentRecipes} />
      ) : (
        <p className="text-muted-foreground">No recipes yet. Check back soon!</p>
      )}
    </div>
  );
}
