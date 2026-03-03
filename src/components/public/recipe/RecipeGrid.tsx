import { RecipeCard } from "./RecipeCard";
import type { Recipe, Label } from "@/db/schema";

type Props = {
  recipes: (Recipe & { recipeLabels: { label: Label }[] })[];
};

export function RecipeGrid({ recipes }: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
