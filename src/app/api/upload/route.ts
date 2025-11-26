import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";
import crypto from "crypto";

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

// Node.js runtime is required for aws-sdk v3.
export const runtime = "nodejs";

// Lazily create the client so that missing env vars don't crash import time.
function createR2Client() {
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    console.warn(
      "[upload route] Missing one or more R2 env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
    );
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function POST(request: NextRequest) {
  const s3 = createR2Client();

  if (!s3 || !endpoint || !bucketName) {
    return NextResponse.json(
      { error: "R2 is not configured on the server." },
      { status: 500 }
    );
  }

  if (!publicBaseUrl) {
    return NextResponse.json(
      { error: "R2 public base URL is not configured." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Missing file in form data under key 'file'." },
      { status: 400 }
    );
  }

  const blob = file as Blob;
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // TypeScript-friendly access to name/type on File
  const anyFile = file as any;
  const mimeType: string =
    typeof anyFile.type === "string" && anyFile.type.length > 0
      ? anyFile.type
      : "application/octet-stream";
  const originalName: string =
    typeof anyFile.name === "string" && anyFile.name.length > 0
      ? anyFile.name
      : "upload.bin";

  const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
  const ext = extMatch ? extMatch[0] : "";
  const key = `threads/${crypto.randomUUID()}${ext}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const base = publicBaseUrl.replace(/\/$/, "");
    const url = `${base}/${key}`;

    return NextResponse.json({ url, mimeType });
  } catch (error) {
    console.error("[upload route] R2 upload failed", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
