"use server";

import { updateTag } from "next/cache";

/**
 * Targeted invalidation: refresh one incident's cached segment from the
 * customer API. updateTag expires the entry immediately so the next render
 * waits for fresh data (read-your-own-writes), which is what a responder
 * expects after pressing "refresh".
 */
export async function refreshIncident(id: string) {
  if (!/^INC-\d{4}$/.test(id)) return;
  updateTag(`incident:${id}`);
}
