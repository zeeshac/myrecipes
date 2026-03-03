"use server";

import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { z } from "zod";

const LabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createLabel(
  _prev: { error: string } | null | undefined,
  formData: FormData
): Promise<{ error: string } | null> {
  const parsed = LabelSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: "Invalid data." };
  }

  const { name, color, sortOrder } = parsed.data;
  const slug = slugify(name, { lower: true, strict: true });

  try {
    await db.insert(labels).values({
      name,
      slug,
      color: color || null,
      sortOrder,
    });
  } catch {
    return { error: "A label with that name already exists." };
  }

  revalidatePath("/manage/labels");
  revalidatePath("/", "layout");
  return null;
}

export async function deleteLabel(id: string) {
  await db.delete(labels).where(eq(labels.id, id));
  revalidatePath("/manage/labels");
  revalidatePath("/", "layout");
}

export async function updateLabel(id: string, formData: FormData) {
  const parsed = LabelSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: "Invalid data." };
  }

  const { name, color, sortOrder } = parsed.data;
  const slug = slugify(name, { lower: true, strict: true });

  try {
    await db.update(labels).set({ name, slug, color: color || null, sortOrder }).where(eq(labels.id, id));
  } catch {
    return { error: "A label with that name already exists." };
  }

  revalidatePath("/manage/labels");
  revalidatePath("/", "layout");
}
