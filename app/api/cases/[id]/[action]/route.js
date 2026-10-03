import { after } from "next/server";
import { acceptVerdict, conveneBench, fileAppeal, fileStatement } from "@/lib/cases";
import { HttpError, creds, rateLimit, readBody, route } from "@/lib/http";

const actions = {
  statement: (id, body, who) => fileStatement(id, body, who),
  convene: (id, body, who) => conveneBench(id, who),
  accept: (id, body, who) => acceptVerdict(id, who),
  appeal: (id, body, who) => fileAppeal(id, body, who),
};

export const POST = route(async (req, { params }) => {
  const { id, action } = await params;
  const run = actions[action];
  if (!run) throw new HttpError(404, "Not found.");
  rateLimit(req, "action", 60, 10 * 60 * 1000);

  const { view, work } = await run(id, await readBody(req), creds(req));
  // the bench keeps deliberating after we answer; the page polls for the verdict
  if (work) after(work);
  return Response.json(view);
});
