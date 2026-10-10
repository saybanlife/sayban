/**
 * Helpers for address-type questionnaire answers.
 */

import type { UserAddress } from "../home/currentAddressModel";
import {
  formatAddressChipLabel,
  formatAddressSubtitle
} from "../home/currentAddressModel";

export type AddressAnswer = Partial<UserAddress> & {
  id?: number | string | null;
};

const PENDING_KEY = "sayban.addressQuestion.pendingKnownIds";

export function addressAnswerId(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const id = Number((value as AddressAnswer).id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function isSameAddressAnswer(
  value: unknown,
  address: UserAddress
): boolean {
  const selectedId = addressAnswerId(value);
  if (selectedId != null) return selectedId === Number(address.id);
  if (!value || typeof value !== "object") return false;
  const row = value as AddressAnswer;
  const city = String(row.city || "").trim();
  const line = String(row.address || "").trim();
  if (!city && !line) return false;
  return (
    city === String(address.city || "").trim() &&
    line === String(address.address || "").trim()
  );
}

export function toAddressAnswer(address: UserAddress): AddressAnswer {
  return {
    id: address.id,
    title: address.title ?? "",
    city: address.city ?? "",
    address: address.address ?? "",
    details: address.details ?? "",
    postal_code: address.postal_code ?? "",
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null
  };
}

export function addressCardTitle(address: UserAddress) {
  return formatAddressChipLabel(address);
}

export function addressCardSubtitle(address: UserAddress) {
  return formatAddressSubtitle(address);
}

export function findNewAddressId(
  addresses: UserAddress[],
  knownIds: Array<number | string>
): number | null {
  const known = new Set(
    knownIds
      .map(value => Number(value))
      .filter(id => Number.isFinite(id) && id > 0)
  );
  const created = addresses.find(item => !known.has(Number(item.id)));
  return created ? Number(created.id) : null;
}

export function rememberKnownAddressIds(ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function consumeNewAddressId(
  addresses: UserAddress[]
): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_KEY);
    const known = JSON.parse(raw) as unknown[];
    if (!Array.isArray(known)) return null;
    return findNewAddressId(addresses, known as Array<number | string>);
  } catch {
    return null;
  }
}
