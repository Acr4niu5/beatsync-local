import { GetDefaultAudioType } from "@beatsync/shared";
import { getPublicUrlForKey, listObjectsWithPrefix } from "../lib/r2";
import { jsonResponse, errorResponse } from "../utils/responses";

export async function handleGetDefaultAudio(req: Request) {
  try {
    // List all objects with "default/" prefix
    const objects = await listObjectsWithPrefix("default/");

    if (!objects || objects.length === 0) {
      return jsonResponse([]);
    }

    // Map to array of objects with public URLs
    const origin = new URL(req.url).origin;
    const response: GetDefaultAudioType = objects.map((obj) => {
      let url = getPublicUrlForKey(obj.Key!);
      if (url.startsWith("/")) url = origin + url;
      return { url };
    });

    return jsonResponse(response);
  } catch (error) {
    console.error("Failed to list default audio files:", error);
    return errorResponse("Failed to list default audio files", 500);
  }
}
