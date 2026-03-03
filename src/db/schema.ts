import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  primaryKey,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

// ─── Labels ───────────────────────────────────────────────────────────────────

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color"), // optional hex color for badge UI
  sortOrder: integer("sort_order").notNull().default(0),
  showInNav: boolean("show_in_nav").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labelsRelations = relations(labels, ({ many }) => ({
  recipeLabels: many(recipeLabels),
}));

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  heroImageUrl: text("hero_image_url"),
  heroImageAlt: text("hero_image_alt"),
  prepTimeMin: integer("prep_time_min"),
  cookTimeMin: integer("cook_time_min"),
  servings: text("servings"), // e.g. "4 servings", "Makes 12 cookies"
  difficulty: difficultyEnum("difficulty"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  // Nutrition from Edamam API — simple fixed shape, no need to normalize
  nutrition: jsonb("nutrition").$type<{
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null>(),
  nutritionCalculatedAt: timestamp("nutrition_calculated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recipesRelations = relations(recipes, ({ many }) => ({
  sections: many(recipeSections),
  recipeLabels: many(recipeLabels),
}));

// ─── Recipe Sections ──────────────────────────────────────────────────────────
// Groups ingredients + steps. A simple recipe has one section with a null title.
// A complex recipe ("For the cake" / "For the frosting") has multiple named sections.

export const recipeSections = pgTable("recipe_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  title: text("title"), // null = unnamed/only section
  sortOrder: integer("sort_order").notNull().default(0),
});

export const recipeSectionsRelations = relations(
  recipeSections,
  ({ one, many }) => ({
    recipe: one(recipes, {
      fields: [recipeSections.recipeId],
      references: [recipes.id],
    }),
    ingredients: many(ingredients),
    steps: many(steps),
  })
);

// ─── Ingredients ──────────────────────────────────────────────────────────────

export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => recipeSections.id, { onDelete: "cascade" }),
  qty: text("qty"), // "1 1/2", "a handful" — human-readable, not numeric
  unit: text("unit"), // "cups", "tbsp", null
  name: text("name").notNull(),
  notes: text("notes"), // "sifted", "room temperature"
  sortOrder: integer("sort_order").notNull().default(0),
});

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  section: one(recipeSections, {
    fields: [ingredients.sectionId],
    references: [recipeSections.id],
  }),
}));

// ─── Steps ────────────────────────────────────────────────────────────────────

export const steps = pgTable("steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => recipeSections.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"), // optional step photo via Cloudinary
  sortOrder: integer("sort_order").notNull().default(0),
});

export const stepsRelations = relations(steps, ({ one }) => ({
  section: one(recipeSections, {
    fields: [steps.sectionId],
    references: [recipeSections.id],
  }),
}));

// ─── Recipe ↔ Labels (many-to-many) ──────────────────────────────────────────

export const recipeLabels = pgTable(
  "recipe_labels",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.labelId] })]
);

export const recipeLabelsRelations = relations(recipeLabels, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeLabels.recipeId],
    references: [recipes.id],
  }),
  label: one(labels, {
    fields: [recipeLabels.labelId],
    references: [labels.id],
  }),
}));

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type RecipeSection = typeof recipeSections.$inferSelect;
export type NewRecipeSection = typeof recipeSections.$inferInsert;

export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;

export type Step = typeof steps.$inferSelect;
export type NewStep = typeof steps.$inferInsert;

// Full recipe shape with all relations loaded
export type RecipeWithRelations = Recipe & {
  sections: (RecipeSection & {
    ingredients: Ingredient[];
    steps: Step[];
  })[];
  recipeLabels: { label: Label }[];
};
