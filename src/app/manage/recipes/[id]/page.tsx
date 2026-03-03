import { db } from "@/db";
import { labels, recipes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/admin/recipe/RecipeForm";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [recipe, allLabels] = await Promise.all([
    db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: {
        sections: {
          with: {
            ingredients: true,
            steps: true,
          },
        },
        recipeLabels: { with: { label: true } },
      },
    }),
    db.select().from(labels).orderBy(asc(labels.sortOrder)),
  ]);

  if (!recipe) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">
          Edit recipe
        </h1>
        <p className="mt-1 text-muted-foreground font-medium">{recipe.title}</p>
      </div>
      <RecipeForm allLabels={allLabels} recipe={recipe} />
    </div>
  );
}
