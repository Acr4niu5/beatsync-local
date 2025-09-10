import { jsonResponse, errorResponse } from "../utils/responses";
import {
  getStorageProvider,
  uploadBytes,
  getPublicAudioUrl,
} from "../lib/r2";

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 100 * 1024 * 1024); // default 100MB

// PUT /upload/direct?roomId=..&fileName=..&contentType=..
export async function handleDirectUpload(req: Request): Promise<Response> {
  if (getStorageProvider() !== "local") {
    return errorResponse("Direct upload is only available in local mode", 404);
  }
  if (req.method !== "PUT") {
    return errorResponse("Method not allowed", 405);
  }
  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");
  const fileName = url.searchParams.get("fileName");
  const contentType = url.searchParams.get("contentType") || "audio/mpeg";
  if (!roomId || !fileName) {
    return errorResponse("Missing roomId or fileName", 400);
  }

  try {
    // Enforce max size by reading as ArrayBuffer and checking length
    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
      return errorResponse("File too large", 413);
    }

    const publicUrl = await uploadBytes(new Uint8Array(arrayBuffer), roomId, fileName, contentType);
    return jsonResponse({ success: true, url: publicUrl });
  } catch (e) {
    return errorResponse("Failed to save file", 500);
  }
}
