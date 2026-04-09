/**
 * @file manifestValidation.ts
 * @description Zod validation schemas for the OQSE Application Manifest (§2.1.1).
 *
 * Mirrors every type defined in `manifest.ts` and exposes helper functions for
 * validating manifest objects received from plugins, presets, or remote sources.
 *
 * @see {@link ../../types/manifest.ts} for the corresponding TypeScript type definitions.
 * @see {@link /docs/specs/open-study-exchange-v1.md} for the canonical specification.
 */

import { z } from 'zod';
import { FeatureProfileSchema } from './oqseValidation';

// ============================================================================
// Primitive helpers
// ============================================================================

/** Non-empty plain-text string (no leading/trailing whitespace). */
const NonEmptyStringSchema = z.string().min(1, 'Hodnota nesmí být prázdná').trim();

/** Absolute URL (http/https). */
const AbsoluteURLSchema = z
  .string()
  .url('Musí být platná absolutní URL')
  .refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
    message: 'URL musí používat schéma http nebo https',
  });

/** Semver version string in MAJOR.MINOR format (e.g. "1.0", "2.3"). */
const ManifestVersionSchema = z
  .string()
  .regex(/^\d+\.\d+$/, 'Verze musí být ve formátu MAJOR.MINOR (např. "1.0")');

/** Full semver version string MAJOR.MINOR.PATCH (e.g. "1.2.3"). */
const SemVerSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Verze musí být ve formátu MAJOR.MINOR.PATCH (např. "1.2.3")');

// ============================================================================
// Actions
// ============================================================================

/** Official actions defined in the OQSE specification. */
const OFFICIAL_ACTIONS = ['render', 'edit', 'validate', 'import', 'export'] as const;

/**
 * A valid OQSE action: one of the five official actions, or a vendor-specific
 * action prefixed with `x-` (e.g. `x-acme-grade`).
 */
export const OQSEActionSchema = z
  .string()
  .refine(
    (v) => (OFFICIAL_ACTIONS as ReadonlyArray<string>).includes(v) || v.startsWith('x-'),
    {
      message:
        'Akce musí být jedna z [render, edit, validate, import, export] nebo mít prefix "x-"',
    }
  );

// ============================================================================
// Study Mode & Question Density
// ============================================================================

/** Recommended study modality for a set of items. */
export const OQSEStudyModeSchema = z.enum(['game', 'fun', 'drill']);

/** Recommended question density per session. */
export const OQSEQuestionDensitySchema = z.enum(['low', 'medium', 'high']);

// ============================================================================
// Feature Flags
// ============================================================================

/** Official feature keys as defined in §2.1.1 of the OQSE spec. */
const OFFICIAL_FEATURE_KEYS = [
  'math',
  'media',
  'media-image',
  'media-audio',
  'media-video',
  'media-model',
  'hotspots',
  'hotspots-3d',
  'complex-pairing',
  'open-text',
  'chess',
] as const;

/**
 * A feature flag: one of the official keys or a vendor-specific key prefixed
 * with `x-` (e.g. `x-acme-chemistry`).
 */
export const FeatureFlagSchema = z
  .string()
  .refine(
    (v) => (OFFICIAL_FEATURE_KEYS as ReadonlyArray<string>).includes(v) || v.startsWith('x-'),
    {
      message:
        'Funkce musí být jedna z oficiálních klíčů nebo mít prefix "x-"',
    }
  );

// ============================================================================
// Property Key Schemas
// ============================================================================

/** Official item-level extension property keys (or vendor-prefixed). */
export const ItemPropertyKeySchema = z
  .string()
  .min(1, 'Klíč vlastnosti položky nesmí být prázdný');

/** Official meta-level extension property keys (or vendor-prefixed). */
export const MetaPropertyKeySchema = z
  .string()
  .min(1, 'Klíč vlastnosti metadat nesmí být prázdný');

// ============================================================================
// WildcardOrExplicit pattern
// ============================================================================

/**
 * Creates a schema for the `WildcardOrExplicit<T>` pattern used in
 * `ManifestAssets` and `ManifestCapabilities`.
 *
 * Valid values:
 * - `['*']`  — wildcard, accepts anything
 * - `T[]`    — explicit allow-list
 * - `null`   — feature disabled / not supported
 */
function wildcardOrExplicit<T extends z.ZodTypeAny>(
  itemSchema: T
): z.ZodUnion<[z.ZodTuple<[z.ZodLiteral<'*'>]>, z.ZodArray<T>, z.ZodNull]> {
  return z.union([z.tuple([z.literal('*')]), z.array(itemSchema), z.null()]);
}

// ============================================================================
// MIME Type Schemas
// ============================================================================

/** Any valid image MIME type. */
export const ImageMimeTypeSchema = z
  .string()
  .refine((v) => v.startsWith('image/'), { message: 'Musí být platný MIME typ obrázku (image/...)' });

/** Any valid audio MIME type. */
export const AudioMimeTypeSchema = z
  .string()
  .refine((v) => v.startsWith('audio/'), { message: 'Musí být platný MIME typ zvuku (audio/...)' });

/** Any valid video MIME type. */
export const VideoMimeTypeSchema = z
  .string()
  .refine((v) => v.startsWith('video/'), { message: 'Musí být platný MIME typ videa (video/...)' });

/** Any valid 3D model MIME type. */
export const ModelMimeTypeSchema = z
  .string()
  .refine(
    (v) => v.startsWith('model/') || v === 'application/octet-stream',
    { message: 'Musí být platný MIME typ 3D modelu (model/... nebo application/octet-stream)' }
  );

// ============================================================================
// Manifest Assets
// ============================================================================

/**
 * Declares which media asset MIME types an application can handle.
 * `null` means the category is not supported; `['*']` means all MIME types
 * within that category are accepted; an array lists explicit MIME types.
 */
export const ManifestAssetsSchema = z.object({
  images: wildcardOrExplicit(ImageMimeTypeSchema).optional(),
  audio: wildcardOrExplicit(AudioMimeTypeSchema).optional(),
  video: wildcardOrExplicit(VideoMimeTypeSchema).optional(),
  models: wildcardOrExplicit(ModelMimeTypeSchema).optional(),
});

// ============================================================================
// Manifest Capabilities
// ============================================================================

/**
 * Full capability declaration of an OQSE-compatible application.
 * Extends FeatureProfile with application-level capability fields.
 */
export const ManifestCapabilitiesSchema = FeatureProfileSchema.extend({
  /**
   * Supported OQSE actions (at least one required).
   * Either official action names or `x-` vendor prefixes.
   */
  actions: z
    .array(OQSEActionSchema)
    .min(1, 'Aplikace musí podporovat alespoň jednu akci'),

  /** Item types supported by this application. Uses `['*']` for all types. */
  types: wildcardOrExplicit(NonEmptyStringSchema).optional(),

  /** Media asset categories and MIME types the application can handle. */
  assets: ManifestAssetsSchema.optional(),
});

// ============================================================================
// Root Manifest Schema
// ============================================================================

/**
 * Full OQSE Application Manifest schema (§2.1.1).
 *
 * Validated constraints beyond syntax:
 * - `minOqseVersion` ≤ `maxOqseVersion` when both are present
 * - `version` adheres to MAJOR.MINOR format
 * - `capabilities.actions` is non-empty (enforced by inner schema)
 */
export const OQSEManifestSchema = z
  .object({
    // ── Identity ──────────────────────────────────────────────────────────

    /** Unique reverse-domain identifier, e.g. `com.acme.flashcards`. */
    id: NonEmptyStringSchema.regex(
      /^[a-z0-9-]+(\.[a-z0-9-]+)*$/,
      'ID musí být ve tvaru reverse-domain (např. "com.acme.app")'
    ),

    /** Human-readable display name of the application. */
    name: NonEmptyStringSchema.max(100, 'Název nesmí být delší než 100 znaků'),

    /**
     * Application version string. Follows MAJOR.MINOR format (manifest version
     * !== OQSE spec version).
     */
    version: ManifestVersionSchema,

    // ── OQSE Compatibility ────────────────────────────────────────────────

    /** Minimum OQSE spec version this application can consume. */
    minOqseVersion: ManifestVersionSchema.optional(),

    /** Maximum OQSE spec version this application can consume. */
    maxOqseVersion: ManifestVersionSchema.optional(),

    // ── Capabilities ──────────────────────────────────────────────────────

    /** Declares all features, item types, and media assets the app handles. */
    capabilities: ManifestCapabilitiesSchema,

    // ── Plugin / Embedding ────────────────────────────────────────────────

    /** Entry-point URL when the application is embedded as an iframe plugin. */
    entryPoint: AbsoluteURLSchema.optional(),

    /** URL of the application's icon (absolute, ≥ 256×256 recommended). */
    iconUrl: AbsoluteURLSchema.optional(),

    // ── Meta ──────────────────────────────────────────────────────────────

    /** Short human-readable description (plain text, ≤ 500 chars). */
    description: z.string().max(500, 'Popis nesmí být delší než 500 znaků').optional(),

    /** Homepage, repository, or documentation URL. */
    homepageUrl: AbsoluteURLSchema.optional(),

    /** SPDX license identifier (e.g. `MIT`, `Apache-2.0`). */
    license: z.string().optional(),

    /** Publisher / vendor name. */
    vendor: z.string().max(100, 'Název vydavatele nesmí být delší než 100 znaků').optional(),

    /** Full semver version of the application binary (informational). */
    appVersion: SemVerSchema.optional(),

    /** Optional tags for discoverability in a plugin catalog. */
    tags: z.array(NonEmptyStringSchema).optional(),

    /** Preferred study mode for sets generated/consumed by this app. */
    preferredStudyMode: OQSEStudyModeSchema.optional(),

    /** Preferred question density for sessions run by this app. */
    preferredQuestionDensity: OQSEQuestionDensitySchema.optional(),
  })
  .refine(
    (data) => {
      // Validate minOqseVersion ≤ maxOqseVersion when both are present
      if (!data.minOqseVersion || !data.maxOqseVersion) return true;

      const minParts = data.minOqseVersion.split('.');
      const maxParts = data.maxOqseVersion.split('.');
      const minMajor = Number(minParts[0]);
      const minMinor = Number(minParts[1]);
      const maxMajor = Number(maxParts[0]);
      const maxMinor = Number(maxParts[1]);

      if (minMajor !== maxMajor) return minMajor < maxMajor;
      return minMinor <= maxMinor;
    },
    {
      message: 'minOqseVersion nesmí být vyšší než maxOqseVersion',
      path: ['minOqseVersion'],
    }
  );

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates an unknown value against `OQSEManifestSchema`.
 *
 * @param data - The value to validate (typically parsed JSON).
 * @returns The validated `OQSEManifest` object.
 * @throws {z.ZodError} when validation fails.
 *
 * @example
 * ```ts
 * const manifest = validateManifest(JSON.parse(rawJson));
 * manifest.capabilities.actions; // string[]
 * ```
 */
export function validateManifest(data: unknown): OQSEManifest {
  return OQSEManifestSchema.parse(data);
}

/**
 * Safely validates an unknown value without throwing.
 *
 * @param data - The value to validate.
 * @returns A Zod `SafeParseReturnType` with `success` flag and either `data` or `error`.
 *
 * @example
 * ```ts
 * const result = safeValidateManifest(raw);
 * if (result.success) {
 *   console.log(result.data.id);
 * } else {
 *   console.error(formatManifestErrors(result.error));
 * }
 * ```
 */
export function safeValidateManifest(
  data: unknown
): ReturnType<typeof OQSEManifestSchema.safeParse> {
  return OQSEManifestSchema.safeParse(data);
}

/**
 * Formats a `ZodError` from manifest validation into a human-readable string.
 *
 * @param error - A `ZodError` returned by `safeValidateManifest`.
 * @returns A newline-separated string listing each validation issue with its path.
 *
 * @example
 * ```ts
 * console.error(formatManifestErrors(result.error));
 * // → "id: ID musí být ve tvaru reverse-domain..."
 * // → "capabilities.actions: Aplikace musí podporovat alespoň jednu akci"
 * ```
 */
export function formatManifestErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const pathStr = issue.path.map((p) => String(p)).join('.');
      return pathStr ? `${pathStr}: ${issue.message}` : issue.message;
    })
    .join('\n');
}

/**
 * Checks whether a plain object looks like an OQSE Manifest (duck-typing).
 *
 * This is a fast pre-check — use `validateManifest` for full validation.
 *
 * @param data - Any value.
 * @returns `true` if `data` has the minimum required shape.
 */
export function isOQSEManifest(data: unknown): data is OQSEManifest {
  return OQSEManifestSchema.safeParse(data).success;
}

// ============================================================================
// Inferred TypeScript Types
// ============================================================================

export type OQSEManifest = z.infer<typeof OQSEManifestSchema>;
export type ManifestCapabilities = z.infer<typeof ManifestCapabilitiesSchema>;
export type ManifestAssets = z.infer<typeof ManifestAssetsSchema>;
export type OQSEAction = z.infer<typeof OQSEActionSchema>;
export type OQSEStudyMode = z.infer<typeof OQSEStudyModeSchema>;
export type OQSEQuestionDensity = z.infer<typeof OQSEQuestionDensitySchema>;
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;
