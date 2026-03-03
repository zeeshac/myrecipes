import { db } from "@/db";
import { recipes } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { PlusCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { togglePublish, deleteRecipe } from "./actions";

export default async function ManageRecipesPage() {
  const allRecipes = await db.query.recipes.findMany({
    orderBy: [desc(recipes.updatedAt)],
    with: { recipeLabels: { with: { label: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Recipes</h1>
          <p className="mt-1 text-muted-foreground">{allRecipes.length} total</p>
        </div>
        <Button asChild>
          <Link href="/manage/recipes/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New recipe
          </Link>
        </Button>
      </div>

      {allRecipes.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          No recipes yet.{" "}
          <Link href="/manage/recipes/new" className="text-primary underline underline-offset-2">
            Create your first one.
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {allRecipes.map((recipe) => (
            <li key={recipe.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">
                    {recipe.title}
                  </span>
                  <Badge variant={recipe.isPublished ? "default" : "secondary"} className="text-xs shrink-0">
                    {recipe.isPublished ? "Published" : "Draft"}
                  </Badge>
                  {recipe.recipeLabels.map(({ label }) => (
                    <Badge key={label.id} variant="outline" className="text-xs shrink-0">
                      {label.name}
                    </Badge>
                  ))}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Updated {new Date(recipe.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <form action={togglePublish.bind(null, recipe.id, !recipe.isPublished)}>
                  <Button type="submit" variant="ghost" size="sm" className="text-xs h-7">
                    {recipe.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                </form>
                <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Link href={`/manage/recipes/${recipe.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <form action={deleteRecipe.bind(null, recipe.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
