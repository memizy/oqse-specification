/**
 * @file manifestValidation.ts
 * @description Zod validation schemas for the OQSE Application Manifest (┬ž2.1.1).
 *
 * Mirrors every type defined in `manifest.ts` and exposes helper functions for
 * validating manifest objects received from plugins, presets, or remote sources.
 *
 * @see {@link ../../types/manifest.ts} for the corresponding TypeScript type definitions.
 * @see {@link /docs/specs/open-study-exchange-v1.md} for the canonical specification.
 */

import { z } from 'zod';
import type {
  FeatureFlag,
  ManifestAssets,
  ManifestCapabilities,
  OQSEAction,
  OQSEManifest,
  OQSEQuestionDensity,
  OQSEStudyMode,
} from './manifest';
import { FeatureProfileSchema } from './oqseValidation';

// ============================================================================
// Primitive helpers
// ============================================================================

/** Non-empty plain-text string (no leading/trailing whitespace). */
const NonEmptyStringSchema = z.string().min(1, 'Hodnota nesm├ş b├Żt pr├ízdn├í').trim();

/** Absolute URL (http/https). */
const AbsoluteURLSchema = z
  .string()
  .url('Mus├ş b├Żt platn├í absolutn├ş URL')
  .refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
    message: 'URL mus├ş pou┼ż├şvat sch├ęma http nebo https',
  });

/** Semver version string in MAJOR.MINOR format (e.g. "1.0", "2.3"). */
const ManifestVersionSchema = z
  .string()
  .regex(/^\d+\.\d+$/, 'Verze mus├ş b├Żt ve form├ítu MAJOR.MINOR (nap┼Ö. "1.0")');

/** Full semver version string MAJOR.MINOR.PATCH (e.g. "1.2.3"). */
const SemVerSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Verze mus├ş b├Żt ve form├ítu MAJOR.MINOR.PATCH (nap┼Ö. "1.2.3")');

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
        'Akce mus├ş b├Żt jedna z [render, edit, validate, import, export] nebo m├şt prefix "x-"',
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

/** Official feature keys as defined in ┬ž2.1.1 of the OQSE spec. */
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
        'Funkce mus├ş b├Żt jedna z ofici├íln├şch kl├ş─Ź┼» nebo m├şt prefix "x-"',
    }
  );

// ============================================================================
// Property Key Schemas
// ============================================================================

/** Official item-level extension property keys (or vendor-prefixed). */
export const ItemPropertyKeySchema = z
  .string()
  .min(1, 'Kl├ş─Ź vlastnosti polo┼żky nesm├ş b├Żt pr├ízdn├Ż');

/** Official meta-level extension property keys (or vendor-prefixed). */
export const MetaPropertyKeySchema = z
  .string()
  .min(1, 'Kl├ş─Ź vlastnosti metadat nesm├ş b├Żt pr├ízdn├Ż');

// ============================================================================
// WildcardOrExplicit pattern
// ============================================================================

/**
 * Creates a schema for the `WildcardOrExplicit<T>` pattern used in
 * `ManifestAssets` and `ManifestCapabilities`.
 *
 * Valid values:
 * - `['*']`  ÔÇö wildcard, accepts anything
 * - `T[]`    ÔÇö explicit allow-list
 * - `null`   ÔÇö feature disabled / not supported
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
  .refine((v) => v.startsWith('image/'), { message: 'Mus├ş b├Żt platn├Ż MIME typ obr├ízku (image/...)' });

/** Any valid audio MIME type. */
export const AudioMimeTypeSchema = z
  .string()
  .refine((v) => v.startsWith('audio/'), { message: 'Mus├ş b├Żt platn├Ż MIME typ zvuku (audio/...)' });

/** Any valid video MIME type. */
export const VideoMimeTypeSchema = z
  .string()
  .refine((v) => v.startsWith('video/'), { message: 'Mus├ş b├Żt platn├Ż MIME typ videa (video/...)' });

/** Any valid 3D model MIME type. */
export const ModelMimeTypeSchema = z
  .string()
  .refine(
    (v) => v.startsWith('model/') || v === 'application/octet-stream',
    { message: 'Mus├ş b├Żt platn├Ż MIME typ 3D modelu (model/... nebo application/octet-stream)' }
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
    .min(1, 'Aplikace mus├ş podporovat alespo┼ł jednu akci'),

  /** Item types supported by this application. Uses `['*']` for all types. */
  types: wildcardOrExplicit(NonEmptyStringSchema).optional(),

  /** Media asset categories and MIME types the application can handle. */
  assets: ManifestAssetsSchema.optional(),
});

// ============================================================================
// Root Manifest Schema
// ============================================================================

/**
 * Full OQSE Application Manifest schema (┬ž2.1.1).
 *
 * Validated constraints beyond syntax:
 * - `minOqseVersion` ÔëĄ `maxOqseVersion` when both are present
 * - `version` adheres to MAJOR.MINOR format
 * - `capabilities.actions` is non-empty (enforced by inner schema)
 */
export const OQSEManifestSchema = z
  .object({
    $schema: AbsoluteURLSchema.optional(),
    // ÔöÇÔöÇ Identity ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

    /** Unique reverse-domain identifier, e.g. `com.acme.flashcards`. */
    id: NonEmptyStringSchema.regex(
      /^[a-z0-9-]+(\.[a-z0-9-]+)*$/,
      'ID mus├ş b├Żt ve tvaru reverse-domain (nap┼Ö. "com.acme.app")'
    ),

    /** Human-readable display name of the application. */
    appName: NonEmptyStringSchema.max(100, 'N├ízev nesm├ş b├Żt del┼í├ş ne┼ż 100 znak┼»'),

    /**
     * Application version string. Follows MAJOR.MINOR format (manifest version
     * !== OQSE spec version).
     */
    version: ManifestVersionSchema,

    pluginVersion: SemVerSchema.optional(),

    // ÔöÇÔöÇ OQSE Compatibility ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

    /** Minimum OQSE spec version this application can consume. */
    minOqseVersion: ManifestVersionSchema.optional(),

    /** Maximum OQSE spec version this application can consume. */
    maxOqseVersion: ManifestVersionSchema.optional(),

    // ÔöÇÔöÇ Capabilities ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

    /** Declares all features, item types, and media assets the app handles. */
    capabilities: ManifestCapabilitiesSchema,

    // ÔöÇÔöÇ Plugin / Embedding ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

    author: z.string().max(100, 'N├ízev autora nesm├ş b├Żt del┼í├ş ne┼ż 100 znak┼»').optional(),

    authorUrl: AbsoluteURLSchema.optional(),

    locales: z.array(NonEmptyStringSchema).optional(),

    /** Short human-readable description (plain text, ÔëĄ 500 chars). */
    description: z.string().max(500, 'Popis nesm├ş b├Żt del┼í├ş ne┼ż 500 znak┼»').optional(),

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
      // Validate minOqseVersion ÔëĄ maxOqseVersion when both are present
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
      message: 'minOqseVersion nesm├ş b├Żt vy┼í┼í├ş ne┼ż maxOqseVersion',
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
 * // Ôćĺ "id: ID mus├ş b├Żt ve tvaru reverse-domain..."
 * // Ôćĺ "capabilities.actions: Aplikace mus├ş podporovat alespo┼ł jednu akci"
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
 * This is a fast pre-check ÔÇö use `validateManifest` for full validation.
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
