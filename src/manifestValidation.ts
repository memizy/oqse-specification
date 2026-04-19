/**
 * @file manifestValidation.ts
 * @description OQSE v0.1 Zod validation schemas for the OQSE Application Manifest (section 2.1.1).
 *
 * Mirrors every type defined in `manifest.ts` and exposes helper functions for
 * validating manifest objects received from plugins, presets, or remote sources.
 *
 * @see {@link ./manifest.ts} for the corresponding TypeScript type definitions.
 * @see {@link ../oqse-manifest.md#oqsem-root-object} for the canonical specification.
 */

import { z } from 'zod';
import {
  OFFICIAL_ACTIONS,
  OFFICIAL_FEATURE_KEYS,
  OFFICIAL_ITEM_PROPERTIES,
  OFFICIAL_META_PROPERTIES,
  type FeatureFlag,
  type ManifestAssets,
  type ManifestCapabilities,
  type OQSEAction,
  type OQSEManifest,
  type OQSEQuestionDensity,
  type OQSEStudyMode,
} from './manifest';
import { FeatureProfileSchema } from './oqseValidation';

// ============================================================================
// Primitive helpers
// ============================================================================

/** Non-empty plain-text string (no leading/trailing whitespace). */
const NonEmptyStringSchema = z.string().min(1, 'Value must not be empty').trim();

/** Absolute URL (http/https). */
const AbsoluteURLSchema = z
  .string()
  .url('Must be a valid absolute URL')
  .refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
    message: 'URL must use http or https scheme',
  });

/** Semver version string in MAJOR.MINOR format (e.g. "0.1", "2.3"). */
const ManifestVersionSchema = z
  .string()
  .regex(/^\d+\.\d+$/, 'Version must be in MAJOR.MINOR format (e.g. "0.1")');

/** Full semver version string MAJOR.MINOR.PATCH with optional pre-release/build metadata (e.g. "1.2.3-rc.1"). */
const SemVerSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/, 'Version must be a valid SemVer string (e.g. "1.2.3" or "1.2.3-rc.1")');

// ============================================================================
// Actions
// ============================================================================

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
        'Action must be one of [render, edit, validate, import, export] or have prefix "x-"',
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
        'Feature must be one of official keys or have prefix "x-"',
    }
  );

// ============================================================================
// Property Key Schemas
// ============================================================================

/** Official item-level extension property keys (or vendor-prefixed). */
export const ItemPropertyKeySchema = z
  .string()
  .refine(
    (v) => (OFFICIAL_ITEM_PROPERTIES as ReadonlyArray<string>).includes(v) || v.startsWith('x-'),
    { message: 'Item property must be an official key or have prefix "x-"' }
  );

/** Official meta-level extension property keys (or vendor-prefixed). */
export const MetaPropertyKeySchema = z
  .string()
  .refine(
    (v) => (OFFICIAL_META_PROPERTIES as ReadonlyArray<string>).includes(v) || v.startsWith('x-'),
    { message: 'Meta property must be an official key or have prefix "x-"' }
  );

// ============================================================================
// WildcardOrExplicit pattern
// ============================================================================

/**
 * Creates a schema for the `WildcardOrExplicit<T>` pattern used in
 * `ManifestAssets` and `ManifestCapabilities`.
 *
 * Valid values:
 * - `['*']` - wildcard, accepts anything
 * - `T[]` - explicit allow-list
 * - `null` - feature disabled / not supported
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
  .refine((v) => v.startsWith('image/'), { message: 'Must be a valid image MIME type (image/...)' });

/** Any valid audio MIME type. */
export const AudioMimeTypeSchema = z
  .string()
  .refine((v) => v.startsWith('audio/'), { message: 'Must be a valid audio MIME type (audio/...)' });

/** Any valid video MIME type. */
export const VideoMimeTypeSchema = z
  .string()
  .refine((v) => v.startsWith('video/'), { message: 'Must be a valid video MIME type (video/...)' });

/** Any valid 3D model MIME type. */
export const ModelMimeTypeSchema = z
  .string()
  .refine(
    (v) => v.startsWith('model/') || v === 'application/octet-stream',
    { message: 'Must be a valid 3D model MIME type (model/... or application/octet-stream)' }
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
  image: wildcardOrExplicit(ImageMimeTypeSchema).optional(),
  audio: wildcardOrExplicit(AudioMimeTypeSchema).optional(),
  video: wildcardOrExplicit(VideoMimeTypeSchema).optional(),
  model: wildcardOrExplicit(ModelMimeTypeSchema).optional(),
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
    .min(1, 'Application must support at least one action'),

  /** Item types supported by this application. Uses `['*']` for all types. */
  types: wildcardOrExplicit(NonEmptyStringSchema).optional(),

  /** Media asset categories and MIME types the application can handle. */
  assets: ManifestAssetsSchema.optional(),
});

// ============================================================================
// Root Manifest Schema
// ============================================================================

/**
 * Full OQSE Application Manifest schema (Table 2.1.1).
 *
 * Validated constraints beyond syntax:
 * - `minOqseVersion` <= `maxOqseVersion` when both are present
 * - `version` adheres to MAJOR.MINOR format
 * - `capabilities.actions` is non-empty (enforced by inner schema)
 */
export const OQSEManifestSchema = z
  .object({
    // Recommended schema URL for draft v0.1: https://raw.githubusercontent.com/memizy/oqse-specification/main/schemas/oqse-manifest-v0.1.json
    $schema: AbsoluteURLSchema.optional(),
    // --- Identity ---

    /** Unique manifest identifier as absolute URL or URN UUID. */
    id: NonEmptyStringSchema.refine(
      (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return v.startsWith('urn:uuid:');
        }
      },
      { message: 'ID must be an absolute URL or a URN-format UUID (urn:uuid:...)' }
    ),

    /** Human-readable display name of the application. */
    appName: NonEmptyStringSchema.max(100, 'Name must not be longer than 100 characters'),

    /**
     * Application version string. Follows MAJOR.MINOR format (manifest version
     * !== OQSE spec version).
     */
    version: ManifestVersionSchema,

    pluginVersion: SemVerSchema.optional(),

    // --- OQSE Compatibility ---

    /** Minimum OQSE spec version this application can consume. */
    minOqseVersion: ManifestVersionSchema.optional(),

    /** Maximum OQSE spec version this application can consume. */
    maxOqseVersion: ManifestVersionSchema.optional(),

    // --- Capabilities ---

    /** Declares all features, item types, and media assets the app handles. */
    capabilities: ManifestCapabilitiesSchema,

    // --- Plugin / Embedding ---

    author: z.string().max(100, 'Author name must not be longer than 100 characters').optional(),

    authorUrl: AbsoluteURLSchema.optional(),

    locales: z.array(NonEmptyStringSchema).optional(),

    /** Short human-readable description (plain text, <= 500 chars). */
    description: z.string().max(500, 'Description must not be longer than 500 characters').optional(),

    emoji: z.string().optional(),

    /** Optional tags for discoverability in a plugin catalog. */
    tags: z.array(NonEmptyStringSchema).optional(),

    /** Preferred study mode for sets generated/consumed by this app. */
    studyMode: OQSEStudyModeSchema.optional(),

    /** Preferred question density for sessions run by this app. */
    questionDensity: OQSEQuestionDensitySchema.optional(),

    appSpecific: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      // Validate minOqseVersion <= maxOqseVersion when both are present
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
      message: 'minOqseVersion must not be greater than maxOqseVersion',
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
  return OQSEManifestSchema.parse(data) as OQSEManifest;
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
 * // Example output:
 * // "id: ID must be an absolute URL or a URN-format UUID (urn:uuid:...)"
 * // "capabilities.actions: Application must support at least one action"
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
 * This is a fast pre-check - use `validateManifest` for full validation.
 *
 * @param data - Any value.
 * @returns `true` if `data` has the minimum required shape.
 */
export function isValidOQSEManifest(data: unknown): data is OQSEManifest {
  return OQSEManifestSchema.safeParse(data).success;
}

// ============================================================================
// Schema Type Contracts
// ============================================================================

const manifestSchemaContracts: {
  OQSEActionSchema: z.ZodType<OQSEAction>;
  OQSEStudyModeSchema: z.ZodType<OQSEStudyMode>;
  OQSEQuestionDensitySchema: z.ZodType<OQSEQuestionDensity>;
  FeatureFlagSchema: z.ZodType<FeatureFlag>;
  ManifestAssetsSchema: z.ZodType<ManifestAssets>;
  ManifestCapabilitiesSchema: z.ZodType<ManifestCapabilities>;
  OQSEManifestSchema: z.ZodType<OQSEManifest>;
} = {
  OQSEActionSchema: OQSEActionSchema as unknown as z.ZodType<OQSEAction>,
  OQSEStudyModeSchema,
  OQSEQuestionDensitySchema,
  FeatureFlagSchema: FeatureFlagSchema as unknown as z.ZodType<FeatureFlag>,
  ManifestAssetsSchema: ManifestAssetsSchema as unknown as z.ZodType<ManifestAssets>,
  ManifestCapabilitiesSchema: ManifestCapabilitiesSchema as unknown as z.ZodType<ManifestCapabilities>,
  OQSEManifestSchema: OQSEManifestSchema as unknown as z.ZodType<OQSEManifest>,
};

void manifestSchemaContracts;
