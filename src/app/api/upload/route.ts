import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  if (!process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Cloudinary not configured." }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "recipes", resource_type: "image" }, (err, res) => {
        if (err || !res) reject(err ?? new Error("Upload failed"));
        else resolve(res as { secure_url: string });
      })
      .end(buffer);
  });

  return NextResponse.json({ url: result.secure_url });
}
