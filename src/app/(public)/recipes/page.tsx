import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { RecipeGrid } from "@/components/public/recipe/RecipeGrid";

export const revalidate = 60;

export const metadata = {
  title: "All Recipes",
};

export default async function AllRecipesPage() {
  const allRecipes = await db.query.recipes.findMany({
    where: eq(recipes.isPublished, true),
    orderBy: [desc(recipes.publishedAt)],
    with: { recipeLabels: { with: { label: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">All Recipes</h1>
        <p className="mt-1 text-muted-foreground">{allRecipes.length} recipes</p>
      </div>
      {allRecipes.length > 0 ? (
        <RecipeGrid recipes={allRecipes} />
      ) : (
        <p className="text-muted-foreground">No recipes yet.</p>
      )}
    </div>
  );
}
