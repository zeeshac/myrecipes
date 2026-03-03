import Link from "next/link";
import Image from "next/image";
import type { Recipe, Label } from "@/db/schema";

type Props = {
  recipe: Recipe & { recipeLabels: { label: Label }[] };
};

export function RecipeCard({ recipe }: Props) {
  return (
    <article>
      <Link href={`/recipes/${recipe.slug}`} className="group block">
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
          {recipe.heroImageUrl ? (
            <Image
              src={recipe.heroImageUrl}
              alt={recipe.heroImageAlt ?? recipe.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-accent">
              <span className="text-3xl" aria-hidden="true">🍽</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="mt-3 font-serif text-lg font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {recipe.title}
        </h2>
      </Link>
    </article>
  );
}
