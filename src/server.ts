import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { withRequestBody, requestBodyLimit, requestBodyFailure } from "./lib/request-body.server";

const handler = createStartHandler(defaultStreamHandler);
const fetch: RequestHandler<Register> = async (request, options) => {
  if (!request.body) return handler(request, options);
  try {
    return await withRequestBody(request, requestBodyLimit(request), async (bounded) =>
      handler(bounded, options),
    );
  } catch (error) {
    const rejected = requestBodyFailure(error, request);
    if (rejected) return rejected;
    throw error;
  }
};

export default { fetch };
