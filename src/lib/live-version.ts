import { createServerFn } from "@tanstack/react-start";
import { APP_VERSION } from "@/lib/app-version";

export const getLiveVersion = createServerFn({ method: "GET" }).handler(async () => APP_VERSION);
