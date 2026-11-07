import { createServerFn } from "@tanstack/react-start";
// TEMP minimal - full restore in progress
export const resetTestMoney = createServerFn({ method: "POST" }).handler(async () => ({ ok: true as const }));
export const resetUserBalance = createServerFn({ method: "POST" }).handler(async () => ({ ok: true as const }));
export const getMyPlace = createServerFn({ method: "GET" }).handler(async () => ({ role: null, status: "open", reason: "", email: "" }));
