import { after } from "next/server";
import { createSample } from "@/lib/cases";
import { rateLimit, route } from "@/lib/http";

export const POST = route(async (req, { params }) => {
  const { sample } = await params;
  rateLimit(req, "sample", 6, 60 * 60 * 1000);
  const { result, work } = await createSample(sample);
  if (work) after(work);
  return Response.json(result, { status: 201 });
});
