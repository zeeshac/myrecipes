"use server";

import { db } from "@/db";
import { recipes, recipeSections, ingredients, steps, recipeLabels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { z } from "zod";

const IngredientSchema = z.object({
  qty: z.string().optional().default(""),
  unit: z.string().optional().default(""),
  name: z.string().min(1),
  notes: z.string().optional().default(""),
});

const StepSchema = z.object({
  content: z.string().min(1),
  imageUrl: z.string().optional().default(""),
});

const SectionSchema = z.object({
  title: z.string().optional().default(""),
  ingredients: z.array(IngredientSchema).default([]),
  steps: z.array(StepSchema).default([]),
});

const RecipeFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  heroImageUrl: z.string().optional().default(""),
  heroImageAlt: z.string().optional().default(""),
  prepTimeMin: z.coerce.number().int().min(0).optional(),
  cookTimeMin: z.coerce.number().int().min(0).optional(),
  servings: z.string().optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  isPublished: z.boolean().default(false),
  labelIds: z.array(z.string()).default([]),
  sections: z.array(SectionSchema).default([]),
});

type RecipeFormData = z.infer<typeof RecipeFormSchema>;

// FormData from the rich client form comes as JSON in a single field
export async function createRecipe(data: RecipeFormData) {
  const parsed = RecipeFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid recipe data." };
  }

  const { sections, labelIds, isPublished, ...recipeFields } = parsed.data;

  const slug = slugify(recipeFields.title, { lower: true, strict: true });

  let newRecipeId: string;
  try {
    const [newRecipe] = await db
      .insert(recipes)
      .values({
        ...recipeFields,
        slug,
        heroImageUrl: recipeFields.heroImageUrl || null,
        heroImageAlt: recipeFields.heroImageAlt || null,
        description: recipeFields.description || null,
        servings: recipeFields.servings || null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      })
      .returning();

    await writeSections(newRecipe.id, sections);
    await writeLabels(newRecipe.id, labelIds);
    newRecipeId = newRecipe.id;
  } catch (e) {
    console.error("createRecipe error:", e);
    return { error: "Failed to save recipe. Check your database connection." };
  }

  revalidatePath("/");
  revalidatePath("/recipes");
  if (isPublished) revalidatePath(`/recipes/${slug}`);

  redirect(`/manage/recipes/${newRecipeId}`);
}

export async function updateRecipe(id: string, data: RecipeFormData) {
  const parsed = RecipeFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid recipe data." };
  }

  const { sections, labelIds, isPublished, ...recipeFields } = parsed.data;

  try {
    const existing = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
    if (!existing) return { error: "Recipe not found." };

    const slug = slugify(recipeFields.title, { lower: true, strict: true });

    await db.update(recipes).set({
      ...recipeFields,
      slug,
      heroImageUrl: recipeFields.heroImageUrl || null,
      heroImageAlt: recipeFields.heroImageAlt || null,
      description: recipeFields.description || null,
      servings: recipeFields.servings || null,
      isPublished,
      publishedAt: isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
      updatedAt: new Date(),
    }).where(eq(recipes.id, id));

    // Replace sections (delete + re-insert is simplest for a personal site)
    await db.delete(recipeSections).where(eq(recipeSections.recipeId, id));
    await writeSections(id, sections);

    await db.delete(recipeLabels).where(eq(recipeLabels.recipeId, id));
    await writeLabels(id, labelIds);

    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${slug}`);
    revalidatePath(`/manage/recipes/${id}`);
  } catch (e) {
    console.error("updateRecipe error:", e);
    return { error: "Failed to save recipe. Check your database connection." };
  }

  return { error: null };
}

export async function deleteRecipe(id: string) {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  if (!recipe) return;
  await db.delete(recipes).where(eq(recipes.id, id));
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipe.slug}`);
  redirect("/manage/recipes");
}

export async function togglePublish(id: string, isPublished: boolean) {
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  if (!recipe) return;
  await db.update(recipes).set({
    isPublished,
    publishedAt: isPublished && !recipe.publishedAt ? new Date() : recipe.publishedAt,
    updatedAt: new Date(),
  }).where(eq(recipes.id, id));
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipe.slug}`);
  revalidatePath(`/manage/recipes/${id}`);
}

// ─── URL Import ───────────────────────────────────────────────────────────────

export async function importRecipeFromUrl(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; recipe-importer/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { error: "Could not fetch that URL." };

    const html = await res.text();

    // Extract JSON-LD
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (!jsonLdMatches) return { error: "No recipe data found on that page." };

    for (const block of jsonLdMatches) {
      const content = block.replace(/<[^>]+>/g, "");
      try {
        const data = JSON.parse(content);
        const recipes = Array.isArray(data) ? data : data["@graph"] ?? [data];
        const recipe = recipes.find((r: { "@type"?: string | string[] }) =>
          r["@type"] === "Recipe" ||
          (Array.isArray(r["@type"]) && r["@type"].includes("Recipe"))
        );
        if (recipe) return { data: parseJsonLdRecipe(recipe) };
      } catch {
        continue;
      }
    }

    return { error: "No recipe data found on that page." };
  } catch {
    return { error: "Failed to fetch the URL. Check it and try again." };
  }
}

function parseJsonLdRecipe(r: Record<string, unknown>) {
  const parseTime = (iso?: string) => {
    if (!iso) return undefined;
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!m) return undefined;
    return (parseInt(m[1] ?? "0") * 60) + parseInt(m[2] ?? "0");
  };

  const rawIngredients: string[] = Array.isArray(r.recipeIngredient)
    ? r.recipeIngredient as string[]
    : [];

  const rawSteps: string[] = Array.isArray(r.recipeInstructions)
    ? (r.recipeInstructions as Array<{ "@type"?: string; text?: string } | string>).map((s) =>
        typeof s === "string" ? s : s.text ?? ""
      ).filter(Boolean)
    : typeof r.recipeInstructions === "string"
    ? [r.recipeInstructions]
    : [];

  return {
    title: (r.name as string) ?? "",
    description: (r.description as string) ?? "",
    prepTimeMin: parseTime(r.prepTime as string),
    cookTimeMin: parseTime(r.cookTime as string),
    servings: r.recipeYield
      ? Array.isArray(r.recipeYield)
        ? String(r.recipeYield[0])
        : String(r.recipeYield)
      : "",
    rawIngredients,
    rawSteps,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function writeSections(
  recipeId: string,
  sections: z.infer<typeof SectionSchema>[]
) {
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    const [newSection] = await db
      .insert(recipeSections)
      .values({ recipeId, title: section.title || null, sortOrder: si })
      .returning();

    for (let ii = 0; ii < section.ingredients.length; ii++) {
      const ing = section.ingredients[ii];
      await db.insert(ingredients).values({
        sectionId: newSection.id,
        qty: ing.qty || null,
        unit: ing.unit || null,
        name: ing.name,
        notes: ing.notes || null,
        sortOrder: ii,
      });
    }

    for (let si2 = 0; si2 < section.steps.length; si2++) {
      const step = section.steps[si2];
      await db.insert(steps).values({
        sectionId: newSection.id,
        content: step.content,
        imageUrl: step.imageUrl || null,
        sortOrder: si2,
      });
    }
  }
}

async function writeLabels(recipeId: string, labelIds: string[]) {
  if (labelIds.length === 0) return;
  await db.insert(recipeLabels).values(
    labelIds.map((labelId) => ({ recipeId, labelId }))
  );
}
