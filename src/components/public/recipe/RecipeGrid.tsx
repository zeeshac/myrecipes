import { RecipeCard } from "./RecipeCard";
import type { Recipe, Label } from "@/db/schema";

type Props = {
  recipes: (Recipe & { recipeLabels: { label: Label }[] })[];
};

export function RecipeGrid({ recipes }: Props) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
