import { db } from "@/db";
import { labels, recipes, recipeLabels } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RecipeGrid } from "@/components/public/recipe/RecipeGrid";

export async function generateStaticParams() {
  const allLabels = await db.select({ slug: labels.slug }).from(labels);
  return allLabels.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const label = await db.query.labels.findFirst({ where: eq(labels.slug, slug) });
  if (!label) return {};
  return { title: label.name };
}

export default async function LabelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const label = await db.query.labels.findFirst({
    where: eq(labels.slug, slug),
  });
  if (!label) notFound();

  // Get recipe IDs that have this label, then fetch full recipe data
  const labeledRows = await db
    .select({ recipeId: recipeLabels.recipeId })
    .from(recipeLabels)
    .where(eq(recipeLabels.labelId, label.id));

  const recipeIds = labeledRows.map((r) => r.recipeId);

  const labeledRecipes =
    recipeIds.length === 0
      ? []
      : await db.query.recipes.findMany({
          where: (r, { and, eq: eqFn }) =>
            and(eqFn(r.isPublished, true), inArray(r.id, recipeIds)),
          orderBy: [desc(recipes.publishedAt)],
          with: { recipeLabels: { with: { label: true } } },
        });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        {label.color && (
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: label.color }}
            aria-hidden="true"
          />
        )}
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            {label.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {labeledRecipes.length} {labeledRecipes.length === 1 ? "recipe" : "recipes"}
          </p>
        </div>
      </div>

      {labeledRecipes.length > 0 ? (
        <RecipeGrid recipes={labeledRecipes} />
      ) : (
        <p className="text-muted-foreground">No recipes with this label yet.</p>
      )}
    </div>
  );
}
