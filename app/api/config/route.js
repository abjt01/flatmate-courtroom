import { publicConfig } from "@/lib/cases";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(publicConfig());
}
