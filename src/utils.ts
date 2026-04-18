import { v7 as uuidv7, validate as uuidValidate } from 'uuid';

export type UUID = string;

/**
 * Validates if the given string is a syntactically valid UUID (any version).
 * Uses the robust validator from the 'uuid' package.
 */
export function isValidUUID(id: string): boolean {
  return uuidValidate(id);
}

/**
 * Generates a new UUIDv7.
 * UUIDv7 is required by the OQSE specification for new items 
 * because it is time-sortable and optimized for database indexing.
 */
export function generateUUID(): UUID {
  return uuidv7();
}