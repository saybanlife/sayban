/** Shared flag so EditStaffs UI can inject into Plasmic submit payload. */
let noCriminalRecord = false;

export function setStaffNoCriminalRecord(value: boolean) {
  noCriminalRecord = Boolean(value);
}

export function getStaffNoCriminalRecord(): boolean {
  return noCriminalRecord;
}

export function parseStaffNoCriminalRecord(raw: unknown): boolean {
  if (raw === true || raw === 1 || raw === "1") return true;
  if (typeof raw === "string" && raw.toLowerCase() === "true") return true;
  return false;
}
