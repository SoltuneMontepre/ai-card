import { NextRequest } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.name.endsWith(".pdf")) {
      const { text: pages } = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });
      text = Array.isArray(pages) ? pages.join("\n") : String(pages);
    } else {
      return Response.json(
        { error: "Unsupported format. Use .docx or .pdf" },
        { status: 400 },
      );
    }

    return Response.json({ text: text.trim() });
  } catch {
    return Response.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
