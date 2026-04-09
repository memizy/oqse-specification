import { UUIDSchema } from './oqseValidation';

export type UUID = string;

export function isValidUUID(id: string): boolean {
  return UUIDSchema.safeParse(id).success;
}

export function generateUUID(): UUID {
  return crypto.randomUUID();
}