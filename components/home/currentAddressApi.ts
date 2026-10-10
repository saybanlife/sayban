import { readCookie } from "../support/supportTypes";
import { resolveApiUrl, PUBLIC_ROUTES } from "../../src/lib/apiRoutes";
import { resolvePublicAuthToken } from "../../src/lib/publicAuthToken";
import {
  normalizeAddressList,
  readStoredAddressId,
  writeStoredAddressId,
  type UserAddress
} from "./currentAddressModel";

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = resolvePublicAuthToken(readCookie("token"));
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extra || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { success: false, message: text.slice(0, 200) };
  }
}

/** List addresses via existing public webhook. */
export async function fetchUserAddresses(): Promise<UserAddress[]> {
  const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.address), {
    headers: buildHeaders(),
    method: "GET"
  });
  const data = await readJson(res);
  return normalizeAddressList(data);
}

export async function fetchCurrentAddress(): Promise<UserAddress | null> {
  try {
    const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.addressCurrent), {
      headers: buildHeaders(),
      method: "GET"
    });
    if (res.ok) {
      const data = await readJson(res);
      if (data?.result) return data.result as UserAddress;
    }
  } catch {
    // fall through to webhook list
  }

  const list = await fetchUserAddresses();
  if (!list.length) return null;
  const storedId = readStoredAddressId();
  const marked = list.find(a => Number(a.is_current) === 1);
  if (marked) return marked;
  if (storedId) {
    const hit = list.find(a => Number(a.id) === storedId);
    if (hit) return hit;
  }
  return list[0] ?? null;
}

export async function selectCurrentAddress(
  addressId: number
): Promise<UserAddress | null> {
  writeStoredAddressId(addressId);
  try {
    const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.addressCurrent), {
      method: "POST",
      headers: buildHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ address_id: addressId })
    });
    const data = await readJson(res);
    if (res.ok && data?.result) return data.result as UserAddress;
  } catch {
    // keep local selection
  }

  const list = await fetchUserAddresses();
  return list.find(a => Number(a.id) === addressId) ?? null;
}
