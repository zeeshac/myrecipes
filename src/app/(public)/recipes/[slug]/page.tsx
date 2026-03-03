import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock, ChefHat, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const published = await db
    .select({ slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.isPublished, true));
  return published.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.slug, slug),
  });
  if (!recipe) return {};
  return {
    title: recipe.title,
    description: recipe.description ?? undefined,
    openGraph: {
      images: recipe.heroImageUrl ? [recipe.heroImageUrl] : [],
      type: "article",
    },
  };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.slug, slug),
    with: {
      sections: {
        with: {
          ingredients: true,
          steps: true,
        },
      },
      recipeLabels: { with: { label: true } },
    },
  });

  if (!recipe || !recipe.isPublished) notFound();

  const sortedSections = [...recipe.sections].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  const totalMin = (recipe.prepTimeMin ?? 0) + (recipe.cookTimeMin ?? 0);
  const difficultyLabel = { easy: "Easy", medium: "Medium", hard: "Hard" };

  // JSON-LD structured data for Google Recipe rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
    author: { "@type": "Person", name: "Zeesha Currimbhoy" },
    datePublished: recipe.publishedAt?.toISOString(),
    prepTime: recipe.prepTimeMin ? `PT${recipe.prepTimeMin}M` : undefined,
    cookTime: recipe.cookTimeMin ? `PT${recipe.cookTimeMin}M` : undefined,
    recipeYield: recipe.servings ?? undefined,
    recipeIngredient: sortedSections.flatMap((s) =>
      [...s.ingredients]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => [i.qty, i.unit, i.name, i.notes].filter(Boolean).join(" "))
    ),
    recipeInstructions: sortedSections.flatMap((s) =>
      [...s.steps]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((st) => ({ "@type": "HowToStep", text: st.content }))
    ),
    nutrition: recipe.nutrition
      ? {
          "@type": "NutritionInformation",
          calories: `${recipe.nutrition.calories} calories`,
          proteinContent: `${recipe.nutrition.protein_g}g`,
          carbohydrateContent: `${recipe.nutrition.carbs_g}g`,
          fatContent: `${recipe.nutrition.fat_g}g`,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-2xl space-y-10">
        {/* Hero */}
        {recipe.heroImageUrl && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Image
              src={recipe.heroImageUrl}
              alt={recipe.heroImageAlt ?? recipe.title}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 672px, 100vw"
            />
          </div>
        )}

        {/* Title & labels */}
        <div className="space-y-3">
          {recipe.recipeLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.recipeLabels.map(({ label }) => (
                <Link key={label.id} href={`/label/${label.slug}`}>
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    style={
                      label.color
                        ? { backgroundColor: label.color + "22", color: label.color }
                        : undefined
                    }
                  >
                    {label.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          <h1 className="font-serif text-4xl font-semibold leading-tight text-foreground">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-lg text-muted-foreground leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Meta bar */}
        {(totalMin > 0 || recipe.servings || recipe.difficulty) && (
        <div className="flex flex-wrap gap-6 rounded-xl bg-accent/40 px-6 py-4 text-sm">
          {totalMin > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium text-foreground">{totalMin} min total</p>
                {recipe.prepTimeMin && recipe.cookTimeMin && (
                  <p className="text-xs text-muted-foreground">
                    {recipe.prepTimeMin}m prep · {recipe.cookTimeMin}m cook
                  </p>
                )}
              </div>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="font-medium text-foreground">{recipe.servings}</p>
            </div>
          )}
          {recipe.difficulty && (
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="font-medium text-foreground">
                {difficultyLabel[recipe.difficulty]}
              </p>
            </div>
          )}
        </div>
        )}

        {/* Nutrition */}
        {recipe.nutrition && (
          <div className="space-y-2">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Nutrition per serving
            </h2>
            <div className="flex gap-6 text-sm">
              {[
                { label: "Calories", value: `${Math.round(recipe.nutrition.calories)}` },
                { label: "Protein", value: `${recipe.nutrition.protein_g.toFixed(1)}g` },
                { label: "Carbs", value: `${recipe.nutrition.carbs_g.toFixed(1)}g` },
                { label: "Fat", value: `${recipe.nutrition.fat_g.toFixed(1)}g` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-xl font-semibold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Nutrition is estimated and may vary.
            </p>
          </div>
        )}

        <Separator />

        {/* Ingredients & Steps */}
        {sortedSections.map((section, si) => {
          const sortedIngredients = [...section.ingredients].sort(
            (a, b) => a.sortOrder - b.sortOrder
          );
          const sortedSteps = [...section.steps].sort(
            (a, b) => a.sortOrder - b.sortOrder
          );

          return (
            <div key={section.id} className="space-y-8">
              {section.title && (
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  {section.title}
                </h2>
              )}

              {/* Ingredients */}
              {sortedIngredients.length > 0 && (
                <div className="space-y-3">
                  {si === 0 && !section.title && (
                    <h2 className="font-serif text-2xl font-semibold text-foreground">
                      Ingredients
                    </h2>
                  )}
                  <ul className="space-y-2">
                    {sortedIngredients.map((ing) => (
                      <li key={ing.id} className="flex gap-3 text-sm">
                        <span className="font-medium text-foreground min-w-[5rem] shrink-0">
                          {[ing.qty, ing.unit].filter(Boolean).join(" ")}
                        </span>
                        <span className="text-foreground/80">
                          {ing.name}
                          {ing.notes && (
                            <span className="text-muted-foreground">, {ing.notes}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Steps */}
              {sortedSteps.length > 0 && (
                <div className="space-y-3">
                  {si === 0 && !section.title && (
                    <h2 className="font-serif text-2xl font-semibold text-foreground">
                      Instructions
                    </h2>
                  )}
                  <ol className="space-y-5">
                    {sortedSteps.map((step, idx) => (
                      <li key={step.id} className="flex gap-4">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <div className="space-y-2 pt-0.5">
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {step.content}
                          </p>
                          {step.imageUrl && (
                            <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg">
                              <Image
                                src={step.imageUrl}
                                alt={`Step ${idx + 1}`}
                                fill
                                className="object-cover"
                                sizes="384px"
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {si < sortedSections.length - 1 && <Separator />}
            </div>
          );
        })}
      </article>
    </>
  );
}
