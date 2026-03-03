import { db } from "@/db";
import { labels } from "@/db/schema";
import { asc } from "drizzle-orm";
import { LabelList } from "@/components/admin/labels/LabelList";
import { CreateLabelForm } from "@/components/admin/labels/CreateLabelForm";

export default async function ManageLabelsPage() {
  const allLabels = await db
    .select()
    .from(labels)
    .orderBy(asc(labels.sortOrder), asc(labels.name));

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Labels</h1>
        <p className="mt-1 text-muted-foreground">
          Labels appear in the site navigation and can be assigned to recipes.
        </p>
      </div>

      <CreateLabelForm />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Existing labels ({allLabels.length})
        </h2>
        <LabelList labels={allLabels} />
      </div>
    </div>
  );
}
