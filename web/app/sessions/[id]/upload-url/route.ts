import { type NextRequest } from "next/server";
import { forwardUploadAction } from "@/lib/upload-route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forwardUploadAction(request, id, "upload-url");
}
