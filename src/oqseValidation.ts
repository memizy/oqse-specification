/**
 * OQSE v0.1 Zod Validation Schemas
 * 
 * Runtime validation schemas for OQSE (Open Quiz & Study Exchange) format.
 * Uses Zod for type-safe runtime validation with detailed error messages.
 * 
 * @see /SPECIFICATION.md
 * @see /src/oqse.ts
 */

import { z } from 'zod';
import type {
  BaseItem,
  CameraSetup,
  CategorizeItem,
  CategorizeItemType,
  ChessPuzzleItem,
  CircleHotspot,
  DiagramLabelItem,
  DiagramZone,
  FeatureProfile,
  FeatureRequirement,
  FillInBlanksItem,
  FillInSelectItem,
  FlashcardItem,
  HotspotObject,
  LanguageCode,
  LinkedSetObject,
  MatchComplexItem,
  MatchPairsItem,
  MathInputItem,
  MathSettings,
  MatrixItem,
  MCQMultiItem,
  MCQSingleItem,
  MediaObject,
  MeshHotspot,
  NoteItem,
  NumericInputItem,
  NumericRange,
  OQSEFile,
  OQSEItem,
  OQSEMeta,
  OpenEndedItem,
  Pedagogy,
  PersonObject,
  PinOnImageItem,
  PinOnModelItem,
  PolygonHotspot,
  RectHotspot,
  Rubric,
  RubricCriterion,
  SelectBlankObject,
  ShortAnswerItem,
  SliderItem,
  SortItemsItem,
  SourceMaterial,
  SourceReference,
  SubtitleTrack,
  TagDefinition,
  TimelineEvent,
  TimelineItem,
  TranslationObject,
  TrueFalseItem,
  Vector3,
} from './oqse';

// ============================================================================
// Reusable Primitives
// ============================================================================

/**
 * UUID validation (accepts UUIDv4 and UUIDv7)
 */
export const UUIDSchema = z.string().uuid({ message: 'Neplatn+� form+�t UUID' });

/**
 * BCP 47 language code (e.g., "en", "en-US", "cs", "zh-Hans")
 */
export const LanguageCodeSchema = z.string().min(2, 'K+-d jazyka mus+� m+�t alespo+� 2 znaky').regex(
  /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/,
  'Neplatn+� form+�t BCP 47 (nap+�. "cs", "en-US")'
);

/**
 * SPDX license identifier
 */
export const SPDXLicenseSchema = z.string().min(1, 'Identifik+�tor licence nesm+� b+�t pr+�zdn+�');

/**
 * ISO 8601 date/time string (RFC 3339 subset)
 */
export const ISO8601DateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/,
  'Neplatn+� form+�t ISO 8601 (nap+�. "2025-11-21T14:30:00Z")'
);

/**
 * Absolute URL validation
 */
export const AbsoluteURLSchema = z.string().url({ message: 'Mus+� b+�t platn+� absolutn+� URL adresa' });

/**
 * Asset key validation (lowercase alphanumeric with _, -)
 */
export const AssetKeySchema = z.string().regex(
  /^[a-z0-9_-]+$/,
  'Kl+��� assetu mus+� obsahovat pouze mal+� p+�smena, ��+�sla, poml��ky a podtr+�+�tka'
);

/**
 * Plain text (non-empty string)
 */
export const PlainTextSchema = z.string().min(1, 'Text nesm+� b+�t pr+�zdn+�');

/**
 * Rich content (Markdown, LaTeX, Media Tags)
 */
export const RichContentSchema = z.string().min(1, 'Obsah nesm+� b+�t pr+�zdn+�');

/**
 * Optional rich content
 */
export const OptionalRichContentSchema = z.string().optional();

// ============================================================================
// Media Types
// ============================================================================

/**
 * Subtitle track for audio/video
 */
export const SubtitleTrackSchema = z.object({
  lang: LanguageCodeSchema,
  value: z.string().min(1, 'URI titulk+� nesm+� b+�t pr+�zdn+�'),
  label: z.string().optional(),
  kind: z.enum(['captions', 'subtitles', 'descriptions']).optional(),
});

/**
 * Media object
 */
export const MediaObjectSchema = z.object({
  type: z.enum(['image', 'audio', 'video', 'model']),
  value: z.string().min(1, 'URI m+�dia nesm+� b+�t pr+�zdn+�'),
  mimeType: z.string().optional(),
  altText: z.string().optional(),
  transcript: RichContentSchema.optional(),
  caption: RichContentSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  start: z.number().nonnegative().optional(),
  end: z.number().positive().optional(),
  loop: z.boolean().optional(),
  subtitles: z.array(SubtitleTrackSchema).optional(),
  license: SPDXLicenseSchema.optional(),
  attribution: z.string().optional(),
  checksums: z.record(z.string(), z.string()).optional(),
}).refine(
  (data) => {
    // Validate start < end if both are present
    if (data.start !== undefined && data.end !== undefined) {
      return data.start < data.end;
    }
    return true;
  },
  {
    message: 'Po��+�te��n+� ��as mus+� b+�t men+�+� ne+� koncov+� ��as',
    path: ['end'],
  }
).refine(
  (data) => {
    // Require altText for images (not required for audio/video/model)
    if (data.type === 'image' && !data.altText) {
      return false;
    }
    return true;
  },
  {
    message: 'Obr+�zky mus+� m+�t definovan+� alternativn+� text (altText) pro p+�+�stupnost',
    path: ['altText'],
  }
);

/**
 * Asset dictionary
 */
export const AssetDictionarySchema = z.record(AssetKeySchema, MediaObjectSchema);

// ============================================================================
// Person Object
// ============================================================================

export const PersonObjectSchema = z.object({
  name: PlainTextSchema,
  role: z.string().optional(),
  email: z.string().email('Neplatn+� form+�t e-mailov+� adresy').optional(),
  url: AbsoluteURLSchema.optional(),
});

// ============================================================================
// Source Material
// ============================================================================

export const SourceMaterialTypeSchema = z.enum([
  'url',
  'doi',
  'isbn',
  'pdf',
  'textbook',
  'video',
  'audio',
  'image',
  'model',
  'other',
]);

export const SourceMaterialSchema = z.object({
  id: PlainTextSchema,
  type: SourceMaterialTypeSchema,
  value: PlainTextSchema,
  title: PlainTextSchema,
  description: z.string().optional(),
  authors: z.array(PlainTextSchema).optional(),
  publishedDate: ISO8601DateTimeSchema.optional(),
  retrievedAt: ISO8601DateTimeSchema.optional(),
  license: SPDXLicenseSchema.optional(),
}).refine(
  (data) => {
    // For URL-based types, value must be a valid URL
    const urlTypes = ['url', 'pdf', 'video', 'audio', 'image'];
    if (urlTypes.includes(data.type)) {
      try {
        new URL(data.value);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Pro typy url, pdf, video, audio a image mus+� b+�t value platn+� URL adresa',
    path: ['value'],
  }
);

export const SourceReferenceSchema = z.object({
  id: PlainTextSchema,
  location: z.string().optional(),
  quote: RichContentSchema.optional(),
});

// ============================================================================
// Tag Definitions
// ============================================================================

export const TagDefinitionSchema = z.object({
  wikidataId: z.string().regex(/^Q\d+$/, 'Wikidata ID mus+� m+�t form+�t Q n+�sledovan+� ��+�slem').optional(),
  description: z.string().optional(),
});

export const TagDefinitionDictionarySchema = z.record(z.string(), TagDefinitionSchema);

// ============================================================================
// Feature Profile (shared between Manifest capabilities & meta.requirements)
// ============================================================================

/**
 * FeatureProfile declares which features, LaTeX packages, and item/meta
 * properties an application supports (Manifest) or a set requires (meta).
 * All arrays accept official values from the registry or custom `x-` prefixed keys.
 */
export const FeatureProfileSchema = z.object({
  features: z.array(z.string().min(1, 'Kl+��� funkce nesm+� b+�t pr+�zdn+�')).optional(),
  latexPackages: z.array(z.string().min(1, 'N+�zev bal+���ku nesm+� b+�t pr+�zdn+�')).optional(),
  itemProperties: z.array(z.string().min(1, 'Kl+��� vlastnosti nesm+� b+�t pr+�zdn+�')).optional(),
  metaProperties: z.array(z.string().min(1, 'Kl+��� vlastnosti nesm+� b+�t pr+�zdn+�')).optional(),
});

// ============================================================================
// Feature Requirements (legacy ��� kept for backward-compat with requiredFeatures)
// ============================================================================

export const FeatureTypeSchema = z.enum(['official', 'experimental', 'proprietary']);

export const OfficialFeatureNameSchema = z.enum([
  'math',
  'media-image',
  'media-audio',
  'media-video',
  'hotspots',
  'complex-pairing',
  'open-text',
]);

export const FeatureRequirementSchema = z.object({
  name: PlainTextSchema,
  type: FeatureTypeSchema,
  vendor: z.string().optional(),
}).refine(
  (data) => {
    // Vendor is required for proprietary features
    if (data.type === 'proprietary' && !data.vendor) {
      return false;
    }
    return true;
  },
  {
    message: 'Propriet+�rn+� funkce mus+� m+�t definovan+� vendor (nap+�. "memizy.com")',
    path: ['vendor'],
  }
);

// ============================================================================
// Translation and Linked Sets
// ============================================================================

export const TranslationObjectSchema = z.object({
  lang: LanguageCodeSchema,
  id: UUIDSchema,
  title: PlainTextSchema,
  downloadUrl: AbsoluteURLSchema.optional(),
});

export const LinkedSetObjectSchema = z.object({
  id: UUIDSchema,
  title: PlainTextSchema,
  downloadUrl: AbsoluteURLSchema.optional(),
});

// ============================================================================
// Pedagogy Object
// ============================================================================

export const BloomLevelSchema = z.enum([
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
]);

export const CognitiveLoadSchema = z.enum(['low', 'medium', 'high']);

export const PedagogySchema = z.object({
  bloomLevel: BloomLevelSchema.optional(),
  irtDifficulty: z.number().optional(),
  irtDiscrimination: z.number().optional(),
  irtGuessing: z.number().min(0).max(1, 'IRT guessing mus+� b+�t mezi 0 a 1').optional(),
  avgTime: z.number().positive().optional(),
  cognitiveLoad: CognitiveLoadSchema.optional(),
  partialCredit: z.boolean().optional(),
  penaltyPerWrong: z.number().min(0).max(1, 'Penalizace mus+� b+�t mezi 0 a 1').optional(),
});

// ============================================================================
// Math Settings
// ============================================================================

export const MathRendererSchema = z.enum(['katex', 'mathjax']);

export const MathSettingsSchema = z.object({
  renderer: MathRendererSchema.optional(),
  packages: z.array(z.string()).optional(),
});

// ============================================================================
// Meta Object
// ============================================================================

export const OQSEMetaSchema = z.object({
  id: UUIDSchema,
  language: LanguageCodeSchema,
  title: PlainTextSchema.max(500, 'Titulek nesm+� b+�t del+�+� ne+� 500 znak+�'),
  description: RichContentSchema.max(5000, 'Popis nesm+� b+�t del+�+� ne+� 5000 znak+�').optional(),
  thumbnail: AssetKeySchema.optional(),
  assets: AssetDictionarySchema.optional(),
  ageMin: z.number().int().nonnegative().optional(),
  ageMax: z.number().int().nonnegative().optional(),
  subject: z.string().optional(),
  createdAt: ISO8601DateTimeSchema,
  updatedAt: ISO8601DateTimeSchema,
  author: PersonObjectSchema.optional(),
  contributors: z.array(PersonObjectSchema).optional(),
  license: SPDXLicenseSchema.optional(),
  licenseUrl: AbsoluteURLSchema.optional(),
  requirements: FeatureProfileSchema.optional(),
  requiredFeatures: z.array(FeatureRequirementSchema).optional(),
  tags: z.array(PlainTextSchema).optional(),
  tagDefinitions: TagDefinitionDictionarySchema.optional(),
  translations: z.array(TranslationObjectSchema).optional(),
  sourceMaterials: z.array(SourceMaterialSchema).optional(),
  estimatedTime: z.number().positive().optional(),
  prerequisites: z.array(LinkedSetObjectSchema).optional(),
  relatedSets: z.array(LinkedSetObjectSchema).optional(),
  mathSettings: MathSettingsSchema.optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
  appSpecific: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => {
    // Validate ageMin <= ageMax
    if (data.ageMin !== undefined && data.ageMax !== undefined) {
      return data.ageMin <= data.ageMax;
    }
    return true;
  },
  {
    message: 'Minim+�ln+� v��k (ageMin) mus+� b+�t men+�+� nebo roven maxim+�ln+�mu v��ku (ageMax)',
    path: ['ageMax'],
  }
).refine(
  (data) => {
    // Validate createdAt <= updatedAt
    const created = new Date(data.createdAt);
    const updated = new Date(data.updatedAt);
    return created <= updated;
  },
  {
    message: 'Datum vytvo+�en+� (createdAt) mus+� b+�t p+�ed nebo stejn+� jako datum aktualizace (updatedAt)',
    path: ['updatedAt'],
  }
);

// ============================================================================
// Base Item Properties
// ============================================================================

export const BaseItemSchema = z.object({
  id: UUIDSchema,
  type: z.string(),
  assets: AssetDictionarySchema.optional(),
  lang: LanguageCodeSchema.optional(),
  tags: z.array(PlainTextSchema).optional(),
  difficulty: z.number().int().min(1, 'Obt+�+�nost mus+� b+�t minim+�ln�� 1').max(5, 'Obt+�+�nost mus+� b+�t maxim+�ln�� 5').optional(),
  timeLimit: z.number().positive('��asov+� limit mus+� b+�t kladn+� ��+�slo').optional(),
  hints: z.array(RichContentSchema.max(2000, 'N+�pov��da nesm+� b+�t del+�+� ne+� 2000 znak+�')).max(20, 'Maxim+�ln�� 20 n+�pov��d na polo+�ku').optional(),
  explanation: RichContentSchema.max(10000, 'Vysv��tlen+� nesm+� b+�t del+�+� ne+� 10000 znak+�').optional(),
  incorrectFeedback: RichContentSchema.optional(),
  sources: z.array(SourceReferenceSchema).optional(),
  relatedItems: z.array(UUIDSchema).optional(),
  dependencyItems: z.array(UUIDSchema).optional(),
  pedagogy: PedagogySchema.optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
  appSpecific: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Helper Data Structures
// ============================================================================

/**
 * Select blank object for fill-in-select
 */
export const SelectBlankObjectSchema = z.object({
  options: z.array(RichContentSchema).min(1, 'Mus+� b+�t alespo+� 1 mo+�nost'),
  correctIndex: z.number().int().nonnegative(),
}).refine(
  (data) => data.correctIndex < data.options.length,
  {
    message: 'Index spr+�vn+� odpov��di odkazuje na neexistuj+�c+� mo+�nost',
    path: ['correctIndex'],
  }
);

/**
 * Hotspot objects (Discriminated Union)
 */
export const RectHotspotSchema = z.object({
  type: z.literal('rect'),
  label: z.string().optional(),
  x: z.number().min(0).max(100, 'X mus+� b+�t v rozmez+� 0-100%'),
  y: z.number().min(0).max(100, 'Y mus+� b+�t v rozmez+� 0-100%'),
  width: z.number().min(0).max(100, '+�+�+�ka mus+� b+�t v rozmez+� 0-100%'),
  height: z.number().min(0).max(100, 'V+�+�ka mus+� b+�t v rozmez+� 0-100%'),
});

export const CircleHotspotSchema = z.object({
  type: z.literal('circle'),
  label: z.string().optional(),
  x: z.number().min(0).max(100, 'X mus+� b+�t v rozmez+� 0-100%'),
  y: z.number().min(0).max(100, 'Y mus+� b+�t v rozmez+� 0-100%'),
  radius: z.number().min(0).max(100, 'Polom��r mus+� b+�t v rozmez+� 0-100%'),
});

export const PolygonHotspotSchema = z.object({
  type: z.literal('polygon'),
  label: z.string().optional(),
  points: z.array(
    z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
  ).min(3, 'Polygon mus+� m+�t alespo+� 3 body'),
});

/**
 * Mesh hotspot ��� references a named node/mesh in a 3D glTF scene.
 * Used exclusively in `pin-on-model` items.
 */
export const MeshHotspotSchema = z.object({
  type: z.literal('mesh'),
  label: z.string().optional(),
  targetName: PlainTextSchema,
});

export const HotspotObjectSchema = z.discriminatedUnion('type', [
  RectHotspotSchema,
  CircleHotspotSchema,
  PolygonHotspotSchema,
  MeshHotspotSchema,
]);

/**
 * 3D vector / point (used by CameraSetup)
 */
export const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

/**
 * Recommended initial camera configuration for pin-on-model items
 */
export const CameraSetupSchema = z.object({
  position: Vector3Schema.optional(),
  target: Vector3Schema.optional(),
});

/**
 * Categorize item
 */
export const CategorizeItemSchema = z.object({
  id: PlainTextSchema,
  text: RichContentSchema,
  correctCategoryIndex: z.number().int().nonnegative(),
});

/**
 * Timeline event
 */
export const TimelinePrecisionSchema = z.enum(['year', 'month', 'day', 'datetime']);

export const TimelineEventSchema = z.object({
  id: PlainTextSchema,
  text: RichContentSchema,
  date: ISO8601DateTimeSchema,
  precision: TimelinePrecisionSchema.optional(),
});

/**
 * Diagram zone (extended hotspot)
 */
export const DiagramZoneSchema = z.union([
  RectHotspotSchema.extend({ correctLabelIndex: z.number().int().nonnegative() }),
  CircleHotspotSchema.extend({ correctLabelIndex: z.number().int().nonnegative() }),
  PolygonHotspotSchema.extend({ correctLabelIndex: z.number().int().nonnegative() }),
]);

/**
 * Rubric for open-ended questions
 */
export const RubricCriterionSchema = z.object({
  label: PlainTextSchema,
  percentage: z.number().min(0, 'Procenta mus+� b+�t nez+�porn+�').max(100, 'Procenta nesm+� p+�es+�hnout 100'),
  description: z.string().optional(),
});

export const RubricSchema = z.object({
  criteria: z.array(RubricCriterionSchema).min(1, 'Rubrika mus+� m+�t alespo+� 1 krit+�rium'),
}).refine(
  (data) => {
    const sum = data.criteria.reduce((acc, c) => acc + c.percentage, 0);
    return sum > 0;
  },
  {
    message: 'Sou��et procent v+�ech krit+�ri+� mus+� b+�t v��t+�+� ne+� 0',
    path: ['criteria'],
  }
);

/**
 * Numeric range
 */
export const NumericRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
}).refine(
  (data) => data.min <= data.max,
  {
    message: 'Minim+�ln+� hodnota mus+� b+�t men+�+� nebo rovna maxim+�ln+� hodnot��',
    path: ['max'],
  }
);

// ============================================================================
// Item Types (Discriminated Union)
// ============================================================================

/**
 * Note Item
 */
export const NoteItemSchema = BaseItemSchema.extend({
  type: z.literal('note'),
  title: z.string().optional(),
  content: RichContentSchema.max(10000, 'Obsah nesm+� b+�t del+�+� ne+� 10000 znak+�'),
});

/**
 * Flashcard Item
 */
export const FlashcardItemSchema = BaseItemSchema.extend({
  type: z.literal('flashcard'),
  front: RichContentSchema.max(10000, 'P+�edn+� strana nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  back: RichContentSchema.max(10000, 'Zadn+� strana nesm+� b+�t del+�+� ne+� 10000 znak+�'),
});

/**
 * True/False Item
 */
export const TrueFalseItemSchema = BaseItemSchema.extend({
  type: z.literal('true-false'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  answer: z.boolean(),
});

/**
 * MCQ Single Item
 */
export const MCQSingleItemSchema = BaseItemSchema.extend({
  type: z.literal('mcq-single'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  options: z.array(RichContentSchema.max(2000, 'Mo+�nost nesm+� b+�t del+�+� ne+� 2000 znak+�')).min(2, 'Ot+�zka mus+� m+�t alespo+� 2 mo+�nosti').max(100, 'Maxim+�ln�� 100 mo+�nost+�'),
  correctIndex: z.number().int().nonnegative(),
  shuffleOptions: z.boolean().optional(),
  optionExplanations: z.array(z.union([RichContentSchema, z.null()])).optional(),
}).refine(
  (data) => data.correctIndex < data.options.length,
  {
    message: 'Index spr+�vn+� odpov��di odkazuje na neexistuj+�c+� mo+�nost',
    path: ['correctIndex'],
  }
).refine(
  (data) => {
    if (data.optionExplanations) {
      return data.optionExplanations.length === data.options.length;
    }
    return true;
  },
  {
    message: 'Po��et vysv��tlen+� mo+�nost+� mus+� b+�t stejn+� jako po��et mo+�nost+�',
    path: ['optionExplanations'],
  }
);

/**
 * MCQ Multi Item
 */
export const MCQMultiItemSchema = BaseItemSchema.extend({
  type: z.literal('mcq-multi'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  options: z.array(RichContentSchema.max(2000, 'Mo+�nost nesm+� b+�t del+�+� ne+� 2000 znak+�')).min(2, 'Ot+�zka mus+� m+�t alespo+� 2 mo+�nosti').max(100, 'Maxim+�ln�� 100 mo+�nost+�'),
  correctIndices: z.array(z.number().int().nonnegative()).min(1, 'Mus+� b+�t alespo+� 1 spr+�vn+� odpov����'),
  minSelections: z.number().int().positive().optional(),
  maxSelections: z.number().int().positive().optional(),
  shuffleOptions: z.boolean().optional(),
  optionExplanations: z.array(z.union([RichContentSchema, z.null()])).optional(),
}).refine(
  (data) => {
    // All correctIndices must be valid
    return data.correctIndices.every(idx => idx < data.options.length);
  },
  {
    message: 'N��kter+� z index+� spr+�vn+�ch odpov��d+� odkazuje na neexistuj+�c+� mo+�nost',
    path: ['correctIndices'],
  }
).refine(
  (data) => {
    // No duplicate indices
    const unique = new Set(data.correctIndices);
    return unique.size === data.correctIndices.length;
  },
  {
    message: 'Indexy spr+�vn+�ch odpov��d+� obsahuj+� duplicity',
    path: ['correctIndices'],
  }
).refine(
  (data) => {
    if (data.minSelections && data.maxSelections) {
      return data.minSelections <= data.maxSelections;
    }
    return true;
  },
  {
    message: 'Minim+�ln+� po��et v+�b��r+� mus+� b+�t men+�+� nebo roven maxim+�ln+�mu po��tu',
    path: ['maxSelections'],
  }
).refine(
  (data) => {
    if (data.maxSelections) {
      return data.maxSelections <= data.options.length;
    }
    return true;
  },
  {
    message: 'Maxim+�ln+� po��et v+�b��r+� nesm+� p+�es+�hnout po��et mo+�nost+�',
    path: ['maxSelections'],
  }
).refine(
  (data) => {
    if (data.optionExplanations) {
      return data.optionExplanations.length === data.options.length;
    }
    return true;
  },
  {
    message: 'Po��et vysv��tlen+� mo+�nost+� mus+� b+�t stejn+� jako po��et mo+�nost+�',
    path: ['optionExplanations'],
  }
);

/**
 * Short Answer Item
 */
export const ShortAnswerItemSchema = BaseItemSchema.extend({
  type: z.literal('short-answer'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  answers: z.array(PlainTextSchema).min(1, 'Mus+� b+�t alespo+� 1 spr+�vn+� odpov����'),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
  acceptPartial: z.boolean().optional(),
  ignoreDiacritics: z.boolean().optional(),
});

/**
 * Fill in Blanks Item
 */
export const FillInBlanksItemSchema = BaseItemSchema.extend({
  type: z.literal('fill-in-blanks'),
  question: OptionalRichContentSchema,
  text: RichContentSchema.max(10000, 'Text nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  blanks: z.record(z.string(), z.array(PlainTextSchema).min(1, 'Ka+�d+� mezera mus+� m+�t alespo+� 1 spr+�vnou odpov����')),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data.blanks).length > 0,
  {
    message: 'Text mus+� obsahovat alespo+� 1 mezeru k dopln��n+�',
    path: ['blanks'],
  }
).refine(
  (data) => {
    // Validate that all blank tokens in text exist in blanks object
    const tokenRegex = /<blank:([a-zA-Z0-9_-]{1,64})\s*\/>/g;
    const tokensInText = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(data.text)) !== null) {
      if (match[1]) {
        tokensInText.add(match[1]);
      }
    }
    
    const tokensInBlanks = new Set(Object.keys(data.blanks));
    
    // Check if all tokens in text have definitions
    for (const token of tokensInText) {
      if (!tokensInBlanks.has(token)) {
        return false;
      }
    }
    
    // Check if all defined blanks are used in text
    for (const token of tokensInBlanks) {
      if (!tokensInText.has(token)) {
        return false;
      }
    }
    
    return true;
  },
  {
    message: 'V+�echny tokeny v textu mus+� m+�t definici v blanks a v+�echny definice mus+� b+�t pou+�ity v textu',
    path: ['blanks'],
  }
);

/**
 * Fill in Select Item
 */
export const FillInSelectItemSchema = BaseItemSchema.extend({
  type: z.literal('fill-in-select'),
  question: OptionalRichContentSchema,
  text: RichContentSchema.max(10000, 'Text nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  blanks: z.record(z.string(), SelectBlankObjectSchema),
}).refine(
  (data) => Object.keys(data.blanks).length > 0,
  {
    message: 'Text mus+� obsahovat alespo+� 1 mezeru k v+�b��ru',
    path: ['blanks'],
  }
).refine(
  (data) => {
    // Validate that all blank tokens in text exist in blanks object
    const tokenRegex = /<blank:([a-zA-Z0-9_-]{1,64})\s*\/>/g;
    const tokensInText = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(data.text)) !== null) {
      if (match[1]) {
        tokensInText.add(match[1]);
      }
    }
    
    const tokensInBlanks = new Set(Object.keys(data.blanks));
    
    for (const token of tokensInText) {
      if (!tokensInBlanks.has(token)) {
        return false;
      }
    }
    
    for (const token of tokensInBlanks) {
      if (!tokensInText.has(token)) {
        return false;
      }
    }
    
    return true;
  },
  {
    message: 'V+�echny tokeny v textu mus+� m+�t definici v blanks a v+�echny definice mus+� b+�t pou+�ity v textu',
    path: ['blanks'],
  }
);

/**
 * Match Pairs Item
 */
export const MatchPairsItemSchema = BaseItemSchema.extend({
  type: z.literal('match-pairs'),
  question: OptionalRichContentSchema,
  prompts: z.array(RichContentSchema).min(2, 'Mus+� b+�t alespo+� 2 p+�ry k p+�i+�azen+�'),
  matches: z.array(RichContentSchema).min(2, 'Mus+� b+�t alespo+� 2 p+�ry k p+�i+�azen+�'),
}).refine(
  (data) => data.prompts.length === data.matches.length,
  {
    message: 'Po��et ot+�zek (prompts) mus+� b+�t stejn+� jako po��et odpov��d+� (matches)',
    path: ['matches'],
  }
);

/**
 * Match Complex Item
 */
export const MatchComplexItemSchema = BaseItemSchema.extend({
  type: z.literal('match-complex'),
  question: OptionalRichContentSchema,
  leftItems: z.array(RichContentSchema).min(1, 'Mus+� b+�t alespo+� 1 polo+�ka vlevo'),
  rightItems: z.array(RichContentSchema).min(1, 'Mus+� b+�t alespo+� 1 polo+�ka vpravo'),
  connections: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])).min(1, 'Mus+� b+�t alespo+� 1 propojen+�'),
  minCorrect: z.number().int().positive().optional(),
}).refine(
  (data) => {
    // Validate all connection indices
    return data.connections.every(([left, right]) => 
      left < data.leftItems.length && right < data.rightItems.length
    );
  },
  {
    message: 'N��kter+� propojen+� odkazuje na neexistuj+�c+� polo+�ku',
    path: ['connections'],
  }
).refine(
  (data) => {
    // Check for duplicate connections
    const connectionSet = new Set(data.connections.map(c => `${c[0]}-${c[1]}`));
    return connectionSet.size === data.connections.length;
  },
  {
    message: 'Propojen+� obsahuj+� duplicity',
    path: ['connections'],
  }
).refine(
  (data) => {
    if (data.minCorrect) {
      return data.minCorrect <= data.connections.length;
    }
    return true;
  },
  {
    message: 'Minim+�ln+� po��et spr+�vn+�ch odpov��d+� nesm+� p+�es+�hnout celkov+� po��et propojen+�',
    path: ['minCorrect'],
  }
);

/**
 * Sort Items Item
 */
export const SortItemsItemSchema = BaseItemSchema.extend({
  type: z.literal('sort-items'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  items: z.array(RichContentSchema).min(2, 'Mus+� b+�t alespo+� 2 polo+�ky k se+�azen+�'),
});

/**
 * Slider Item
 */
export const SliderItemSchema = BaseItemSchema.extend({
  type: z.literal('slider'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  min: z.number(),
  max: z.number(),
  step: z.number().positive('Krok mus+� b+�t kladn+� ��+�slo'),
  correctAnswer: z.number(),
  tolerance: z.number().nonnegative('Tolerance mus+� b+�t nez+�porn+�'),
  unit: z.string().optional(),
}).refine(
  (data) => data.min < data.max,
  {
    message: 'Minim+�ln+� hodnota mus+� b+�t men+�+� ne+� maxim+�ln+� hodnota',
    path: ['max'],
  }
).refine(
  (data) => data.correctAnswer >= data.min && data.correctAnswer <= data.max,
  {
    message: 'Spr+�vn+� odpov���� mus+� b+�t v rozmez+� min-max',
    path: ['correctAnswer'],
  }
).refine(
  (data) => {
    // Check if correctAnswer is reachable by step
    const steps = (data.correctAnswer - data.min) / data.step;
    return Math.abs(steps - Math.round(steps)) < 0.0001;
  },
  {
    message: 'Spr+�vn+� odpov���� mus+� b+�t dosa+�iteln+� pomoc+� definovan+�ho kroku',
    path: ['correctAnswer'],
  }
).refine(
  (data) => data.tolerance <= (data.max - data.min) / 2,
  {
    message: 'Tolerance nesm+� b+�t v��t+�+� ne+� polovina rozsahu hodnot',
    path: ['tolerance'],
  }
);

/**
 * Pin on Image Item
 */
export const PinOnImageItemSchema = BaseItemSchema.extend({
  type: z.literal('pin-on-image'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  targetAsset: AssetKeySchema,
  hotspots: z.array(HotspotObjectSchema).min(1, 'Mus+� b+�t alespo+� 1 hotspot'),
  multipleCorrect: z.boolean().optional(),
  minCorrect: z.number().int().positive().optional(),
}).refine(
  (data) => {
    if (data.minCorrect) {
      return data.minCorrect <= data.hotspots.length;
    }
    return true;
  },
  {
    message: 'Minim+�ln+� po��et spr+�vn+�ch odpov��d+� nesm+� p+�es+�hnout po��et hotspot+�',
    path: ['minCorrect'],
  }
);

/**
 * Categorize Item
 */
export const CategorizeItemTypeSchema = BaseItemSchema.extend({
  type: z.literal('categorize'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  categories: z.array(PlainTextSchema).min(2, 'Mus+� b+�t alespo+� 2 kategorie'),
  items: z.array(CategorizeItemSchema).min(1, 'Mus+� b+�t alespo+� 1 polo+�ka ke kategorizaci'),
}).refine(
  (data) => {
    // Validate all correctCategoryIndex values
    return data.items.every(item => item.correctCategoryIndex < data.categories.length);
  },
  {
    message: 'N��kter+� polo+�ka odkazuje na neexistuj+�c+� kategorii',
    path: ['items'],
  }
);

/**
 * Timeline Item
 */
export const TimelineItemSchema = BaseItemSchema.extend({
  type: z.literal('timeline'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  events: z.array(TimelineEventSchema).min(2, 'Mus+� b+�t alespo+� 2 ud+�losti'),
  randomize: z.boolean().optional(),
});

/**
 * Matrix Item
 */
export const MatrixItemSchema = BaseItemSchema.extend({
  type: z.literal('matrix'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  rows: z.array(PlainTextSchema).min(1, 'Mus+� b+�t alespo+� 1 +�+�dek'),
  columns: z.array(PlainTextSchema).min(1, 'Mus+� b+�t alespo+� 1 sloupec'),
  correctCells: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])).min(1, 'Mus+� b+�t alespo+� 1 spr+�vn+� bu+�ka'),
  multiplePerRow: z.boolean().optional(),
}).refine(
  (data) => {
    // Validate all cell coordinates
    return data.correctCells.every(([row, col]) => 
      row < data.rows.length && col < data.columns.length
    );
  },
  {
    message: 'N��kter+� sou+�adnice bu+�ky odkazuj+� na neexistuj+�c+� +�+�dek nebo sloupec',
    path: ['correctCells'],
  }
).refine(
  (data) => {
    // Check for duplicate cells
    const cellSet = new Set(data.correctCells.map(c => `${c[0]}-${c[1]}`));
    return cellSet.size === data.correctCells.length;
  },
  {
    message: 'Spr+�vn+� bu+�ky obsahuj+� duplicity',
    path: ['correctCells'],
  }
).refine(
  (data) => {
    if (!data.multiplePerRow) {
      // Check that each row has at most one correct cell
      const rowCounts = new Map<number, number>();
      for (const [row] of data.correctCells) {
        rowCounts.set(row, (rowCounts.get(row) || 0) + 1);
      }
      return Array.from(rowCounts.values()).every(count => count <= 1);
    }
    return true;
  },
  {
    message: 'Pokud multiplePerRow je false, ka+�d+� +�+�dek sm+� m+�t maxim+�ln�� 1 spr+�vnou bu+�ku',
    path: ['correctCells'],
  }
);

/**
 * Math Input Item
 */
export const MathInputItemSchema = BaseItemSchema.extend({
  type: z.literal('math-input'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  correctAnswer: PlainTextSchema,
  alternativeAnswers: z.array(PlainTextSchema).optional(),
  tolerance: z.number().nonnegative().optional(),
});

/**
 * Diagram Label Item
 */
export const DiagramLabelItemSchema = BaseItemSchema.extend({
  type: z.literal('diagram-label'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  targetAsset: AssetKeySchema,
  labels: z.array(RichContentSchema).min(1, 'Mus+� b+�t alespo+� 1 +�t+�tek'),
  caseSensitive: z.boolean().optional(),
  requireTyping: z.boolean().optional(),
  zones: z.array(DiagramZoneSchema).min(1, 'Mus+� b+�t alespo+� 1 z+-na'),
}).refine(
  (data) => {
    // Validate all correctLabelIndex values
    return data.zones.every(zone => zone.correctLabelIndex < data.labels.length);
  },
  {
    message: 'N��kter+� z+-na odkazuje na neexistuj+�c+� +�t+�tek',
    path: ['zones'],
  }
);

/**
 * Open Ended Item
 */
export const OpenEndedItemSchema = BaseItemSchema.extend({
  type: z.literal('open-ended'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  minWords: z.number().int().positive().optional(),
  maxWords: z.number().int().positive().optional(),
  sampleAnswer: RichContentSchema.optional(),
  rubric: RubricSchema.optional(),
}).refine(
  (data) => {
    if (data.minWords && data.maxWords) {
      return data.minWords <= data.maxWords;
    }
    return true;
  },
  {
    message: 'Minim+�ln+� po��et slov mus+� b+�t men+�+� nebo roven maxim+�ln+�mu po��tu',
    path: ['maxWords'],
  }
);

/**
 * Numeric Input Item
 */
export const NumericInputItemSchema = BaseItemSchema.extend({
  type: z.literal('numeric-input'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  value: z.number(),
  tolerance: z.number().nonnegative().optional(),
  range: NumericRangeSchema.optional(),
  unit: z.string().optional(),
});

/**
 * Pin on 3D Model Item
 *
 * User locates and clicks a named mesh in a glTF scene.
 */
export const PinOnModelItemSchema = BaseItemSchema.extend({
  type: z.literal('pin-on-model'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  targetAsset: AssetKeySchema,
  hotspots: z.array(MeshHotspotSchema).min(1, 'Mus+� b+�t alespo+� 1 hotspot'),
  multipleCorrect: z.boolean().optional(),
  minCorrect: z.number().int().positive().optional(),
  camera: CameraSetupSchema.optional(),
}).refine(
  (data) => {
    if (data.minCorrect) {
      return data.minCorrect <= data.hotspots.length;
    }
    return true;
  },
  {
    message: 'Minim+�ln+� po��et spr+�vn+�ch odpov��d+� nesm+� p+�es+�hnout po��et hotspot+�',
    path: ['minCorrect'],
  }
);

/**
 * Chess Puzzle Item
 *
 * User finds the correct move sequence on a given board position.
 */
export const ChessPuzzleItemSchema = BaseItemSchema.extend({
  type: z.literal('chess-puzzle'),
  question: RichContentSchema.max(10000, 'Ot+�zka nesm+� b+�t del+�+� ne+� 10000 znak+�'),
  fen: PlainTextSchema,
  answers: z
    .array(
      z.array(PlainTextSchema).min(1, 'Sekvence tah+� nesm+� b+�t pr+�zdn+�')
    )
    .min(1, 'Mus+� b+�t alespo+� 1 spr+�vn+� sekvence tah+�'),
  elo: z.number().int().nonnegative('ELO mus+� b+�t nez+�porn+� cel+� ��+�slo').optional(),
});

// ============================================================================
// OQSE Item (Discriminated Union)
// ============================================================================

/**
 * OQSE Item Schema (Discriminated Union)
 * 
 * This uses Zod's discriminatedUnion for optimal performance and type inference.
 */
export const OQSEItemSchema = z.discriminatedUnion('type', [
  NoteItemSchema,
  FlashcardItemSchema,
  TrueFalseItemSchema,
  MCQSingleItemSchema,
  MCQMultiItemSchema,
  ShortAnswerItemSchema,
  FillInBlanksItemSchema,
  FillInSelectItemSchema,
  MatchPairsItemSchema,
  MatchComplexItemSchema,
  SortItemsItemSchema,
  SliderItemSchema,
  PinOnImageItemSchema,
  CategorizeItemTypeSchema,
  TimelineItemSchema,
  MatrixItemSchema,
  MathInputItemSchema,
  DiagramLabelItemSchema,
  OpenEndedItemSchema,
  NumericInputItemSchema,
  PinOnModelItemSchema,
  ChessPuzzleItemSchema,
]);

// ============================================================================
// OQSE File (Root Structure)
// ============================================================================

/**
 * OQSE File Schema (Root Structure)
 */
export const OQSEFileSchema = z.object({
  // Recommended schema URL for draft v0.1: https://memizy.com/schemas/oqse/v0.1.json
  $schema: z.string().url().optional(),
  version: z.string().regex(/^\d+\.\d+$/, 'Verze musi byt ve formatu "X.Y" (napr. "0.1")'),
  meta: OQSEMetaSchema,
  items: z.array(OQSEItemSchema).max(10000, 'Maxim+�ln�� 10000 polo+�ek na sadu'),
}).refine(
  (data) => {
    // Validate that all relatedItems and dependencyItems exist
    const itemIds = new Set(data.items.map(item => item.id));
    
    for (const item of data.items) {
      if (item.relatedItems) {
        for (const relatedId of item.relatedItems) {
          if (!itemIds.has(relatedId)) {
            return false;
          }
        }
      }
      
      if (item.dependencyItems) {
        for (const depId of item.dependencyItems) {
          if (!itemIds.has(depId)) {
            return false;
          }
        }
      }
    }
    
    return true;
  },
  {
    message: 'N��kter+� polo+�ka odkazuje na neexistuj+�c+� relatedItems nebo dependencyItems',
    path: ['items'],
  }
).refine(
  (data) => {
    // Validate that thumbnail asset exists
    if (data.meta.thumbnail && data.meta.assets) {
      return data.meta.thumbnail in data.meta.assets;
    }
    return true;
  },
  {
    message: 'Thumbnail odkazuje na neexistuj+�c+� asset',
    path: ['meta', 'thumbnail'],
  }
).refine(
  (data) => {
    // Validate that all source references exist
    const sourceMaterialIds = new Set(
      (data.meta.sourceMaterials || []).map(s => s.id)
    );
    
    for (const item of data.items) {
      if (item.sources) {
        for (const sourceRef of item.sources) {
          if (!sourceMaterialIds.has(sourceRef.id)) {
            return false;
          }
        }
      }
    }
    
    return true;
  },
  {
    message: 'N��kter+� polo+�ka odkazuje na neexistuj+�c+� source material',
    path: ['items'],
  }
);

// ============================================================================
// Schema Type Contracts
// ============================================================================

const schemaTypeContracts: {
  LanguageCodeSchema: z.ZodType<LanguageCode>;
  SubtitleTrackSchema: z.ZodType<SubtitleTrack>;
  MediaObjectSchema: z.ZodType<MediaObject>;
  PersonObjectSchema: z.ZodType<PersonObject>;
  SourceMaterialSchema: z.ZodType<SourceMaterial>;
  SourceReferenceSchema: z.ZodType<SourceReference>;
  TagDefinitionSchema: z.ZodType<TagDefinition>;
  FeatureProfileSchema: z.ZodType<FeatureProfile>;
  FeatureRequirementSchema: z.ZodType<FeatureRequirement>;
  TranslationObjectSchema: z.ZodType<TranslationObject>;
  LinkedSetObjectSchema: z.ZodType<LinkedSetObject>;
  PedagogySchema: z.ZodType<Pedagogy>;
  MathSettingsSchema: z.ZodType<MathSettings>;
  OQSEMetaSchema: z.ZodType<OQSEMeta>;
  BaseItemSchema: z.ZodType<BaseItem>;
  SelectBlankObjectSchema: z.ZodType<SelectBlankObject>;
  RectHotspotSchema: z.ZodType<RectHotspot>;
  CircleHotspotSchema: z.ZodType<CircleHotspot>;
  PolygonHotspotSchema: z.ZodType<PolygonHotspot>;
  MeshHotspotSchema: z.ZodType<MeshHotspot>;
  HotspotObjectSchema: z.ZodType<HotspotObject>;
  Vector3Schema: z.ZodType<Vector3>;
  CameraSetupSchema: z.ZodType<CameraSetup>;
  CategorizeItemSchema: z.ZodType<CategorizeItem>;
  TimelineEventSchema: z.ZodType<TimelineEvent>;
  DiagramZoneSchema: z.ZodType<DiagramZone>;
  RubricCriterionSchema: z.ZodType<RubricCriterion>;
  RubricSchema: z.ZodType<Rubric>;
  NumericRangeSchema: z.ZodType<NumericRange>;
  NoteItemSchema: z.ZodType<NoteItem>;
  FlashcardItemSchema: z.ZodType<FlashcardItem>;
  TrueFalseItemSchema: z.ZodType<TrueFalseItem>;
  MCQSingleItemSchema: z.ZodType<MCQSingleItem>;
  MCQMultiItemSchema: z.ZodType<MCQMultiItem>;
  ShortAnswerItemSchema: z.ZodType<ShortAnswerItem>;
  FillInBlanksItemSchema: z.ZodType<FillInBlanksItem>;
  FillInSelectItemSchema: z.ZodType<FillInSelectItem>;
  MatchPairsItemSchema: z.ZodType<MatchPairsItem>;
  MatchComplexItemSchema: z.ZodType<MatchComplexItem>;
  SortItemsItemSchema: z.ZodType<SortItemsItem>;
  SliderItemSchema: z.ZodType<SliderItem>;
  PinOnImageItemSchema: z.ZodType<PinOnImageItem>;
  CategorizeItemTypeSchema: z.ZodType<CategorizeItemType>;
  TimelineItemSchema: z.ZodType<TimelineItem>;
  MatrixItemSchema: z.ZodType<MatrixItem>;
  MathInputItemSchema: z.ZodType<MathInputItem>;
  DiagramLabelItemSchema: z.ZodType<DiagramLabelItem>;
  OpenEndedItemSchema: z.ZodType<OpenEndedItem>;
  NumericInputItemSchema: z.ZodType<NumericInputItem>;
  PinOnModelItemSchema: z.ZodType<PinOnModelItem>;
  ChessPuzzleItemSchema: z.ZodType<ChessPuzzleItem>;
  OQSEItemSchema: z.ZodType<OQSEItem>;
  OQSEFileSchema: z.ZodType<OQSEFile>;
} = {
  LanguageCodeSchema,
  SubtitleTrackSchema,
  MediaObjectSchema,
  PersonObjectSchema,
  SourceMaterialSchema,
  SourceReferenceSchema,
  TagDefinitionSchema,
  FeatureProfileSchema,
  FeatureRequirementSchema,
  TranslationObjectSchema,
  LinkedSetObjectSchema,
  PedagogySchema,
  MathSettingsSchema,
  OQSEMetaSchema,
  BaseItemSchema,
  SelectBlankObjectSchema,
  RectHotspotSchema,
  CircleHotspotSchema,
  PolygonHotspotSchema,
  MeshHotspotSchema,
  HotspotObjectSchema,
  Vector3Schema,
  CameraSetupSchema,
  CategorizeItemSchema,
  TimelineEventSchema,
  DiagramZoneSchema,
  RubricCriterionSchema,
  RubricSchema,
  NumericRangeSchema,
  NoteItemSchema,
  FlashcardItemSchema,
  TrueFalseItemSchema,
  MCQSingleItemSchema,
  MCQMultiItemSchema,
  ShortAnswerItemSchema,
  FillInBlanksItemSchema,
  FillInSelectItemSchema,
  MatchPairsItemSchema,
  MatchComplexItemSchema,
  SortItemsItemSchema,
  SliderItemSchema,
  PinOnImageItemSchema,
  CategorizeItemTypeSchema,
  TimelineItemSchema,
  MatrixItemSchema,
  MathInputItemSchema,
  DiagramLabelItemSchema,
  OpenEndedItemSchema,
  NumericInputItemSchema,
  PinOnModelItemSchema,
  ChessPuzzleItemSchema,
  OQSEItemSchema,
  OQSEFileSchema,
};

void schemaTypeContracts;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates OQSE file and returns parsed result or throws ZodError
 */
export function validateOQSEFile(data: unknown): OQSEFile {
  return OQSEFileSchema.parse(data);
}

/**
 * Safely validates OQSE file and returns result object
 */
export function safeValidateOQSEFile(data: unknown): {
  success: boolean;
  data?: OQSEFile;
  error?: z.ZodError;
} {
  const result = OQSEFileSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates individual OQSE item
 */
export function validateOQSEItem(data: unknown): OQSEItem {
  return OQSEItemSchema.parse(data);
}

/**
 * Safely validates individual OQSE item
 */
export function safeValidateOQSEItem(data: unknown): {
  success: boolean;
  data?: OQSEItem;
  error?: z.ZodError;
} {
  const result = OQSEItemSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Formats Zod validation errors into human-readable messages
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map(err => {
    let pathStr = '';
    err.path.forEach((part, index) => {
      if (typeof part === 'number') {
        pathStr += `[${part}]`;
      } else {
        const isFirstOrAfterNumber = index === 0 || typeof err.path[index - 1] === 'number';
        pathStr += (isFirstOrAfterNumber ? '' : '.') + String(part);
      }
    });
    return pathStr ? `${pathStr}: ${err.message}` : err.message;
  });
}

