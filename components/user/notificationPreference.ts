import axios from "axios";
import { readCookie } from "@/lib/authCookies";
import { PUBLIC_AUTH_COOKIE_NAME } from "@/lib/publicAuthToken";
import { resolveApiUrl } from "@/lib/apiRoutes";

export function asNotificationPreference(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export async function saveNotificationPreference(isnotif: boolean) {
  const token = readCookie(PUBLIC_AUTH_COOKIE_NAME);
  if (!token) throw new Error("Missing public authentication token");
  const response = await axios.post(
    resolveApiUrl("setProfile"),
    { isnotif },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.data?.success === false) {
    throw new Error(response.data?.message || "Notification preference update failed");
  }
  return response.data;
}
