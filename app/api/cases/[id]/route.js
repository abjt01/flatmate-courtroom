import { getView } from "@/lib/cases";
import { creds, route } from "@/lib/http";

export const GET = route(async (req, { params }) => {
  const { id } = await params;
  return Response.json(await getView(id, creds(req)), { headers: { "Cache-Control": "no-store" } });
});
