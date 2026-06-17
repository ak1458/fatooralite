import { v4 as uuidv4 } from "uuid";

/** RFC-4122 v4 UUID for an invoice. */
export function newUuid(): string {
  return uuidv4();
}
