import { readCookie } from "../support/supportTypes";
import { resolvePublicAuthToken } from "../../src/lib/publicAuthToken";

/**
 * The centre page renders for anonymous visitors too, so the “ثبت نظر” action
 * is only offered once there is a token to post with. Posting itself is handled
 * by the page's own rating dialog (the one the hero heart icon opens).
 */
export function canSubmitCenterReview(): boolean {
  return Boolean(resolvePublicAuthToken(readCookie("token")));
}
