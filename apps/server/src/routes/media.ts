import { errorResponse, corsHeaders } from "../utils/responses";
import { getStorageProvider, resolveLocalPathForKey } from "../lib/r2";

// Serve files from local storage with Range support.
export async function handleMedia(req: Request): Promise<Response> {
  const provider = getStorageProvider();
  if (provider !== "local") {
    return errorResponse("Media route is only available in local mode", 404);
  }

  const url = new URL(req.url);
  const pathname = url.pathname; // /media/<key>
  const prefix = "/media/";
  if (!pathname.startsWith(prefix)) {
    return errorResponse("Not found", 404);
  }

  // Extract key and basic validation
  const rawKey = pathname.substring(prefix.length);
  // Decode each path segment to map to actual filesystem names
  const key = rawKey
    .split("/")
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join("/");
  if (!key || key.includes("..")) {
    return errorResponse("Invalid path", 400);
  }

  // Only allow room-*/ or default/ namespaces
  if (!key.startsWith("room-") && !key.startsWith("default/")) {
    return errorResponse("Invalid media namespace", 400);
  }

  try {
    const filePath = resolveLocalPathForKey(key);
    const file = Bun.file(filePath);
    if (!(await file.exists())) return errorResponse("Not found", 404);

    const size = file.size;
    const range = req.headers.get("range");
    const mimeType = file.type || "audio/mpeg";

    if (!range) {
      return new Response(file, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": mimeType,
          "Content-Length": String(size),
          "Accept-Ranges": "bytes",
        },
      });
    }

    // Parse Range header: bytes=start-end
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) {
      return errorResponse("Invalid Range", 416);
    }
    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : size - 1;
    if (isNaN(start) || isNaN(end) || start > end || end >= size) {
      return errorResponse("Invalid Range", 416);
    }

    const chunkSize = end - start + 1;
    const stream = file.slice(start, end + 1);

  return new Response(stream, {
      status: 206,
      headers: {
    ...corsHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": mimeType,
      },
    });
  } catch (e) {
    return errorResponse("Not found", 404);
  }
}
