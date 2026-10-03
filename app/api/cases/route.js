import { createCase } from "@/lib/cases";
import { rateLimit, readBody, route } from "@/lib/http";

export const POST = route(async (req) => {
  rateLimit(req, "create", 20, 60 * 60 * 1000);
  return Response.json(await createCase(await readBody(req)), { status: 201 });
});
