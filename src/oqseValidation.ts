/**
 * OQSE v1.0 Zod Validation Schemas
 * 
 * Runtime validation schemas for OQSE (Open Quiz & Study Exchange) format.
 * Uses Zod for type-safe runtime validation with detailed error messages.
 * 
 * @see /docs/specs/open-study-exchange-v1-en.md
 * @see /src/types/oqse.ts
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
export const UUIDSchema = z.string().uuid({ message: 'Neplatn├Ż form├ít UUID' });

/**
 * BCP 47 language code (e.g., "en", "en-US", "cs", "zh-Hans")
 */
export const LanguageCodeSchema = z.string().min(2, 'K├│d jazyka mus├ş m├şt alespo┼ł 2 znaky').regex(
  /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/,
  'Neplatn├Ż form├ít BCP 47 (nap┼Ö. "cs", "en-US")'
);

/**
 * SPDX license identifier
 */
export const SPDXLicenseSchema = z.string().min(1, 'Identifik├ítor licence nesm├ş b├Żt pr├ízdn├Ż');

/**
 * ISO 8601 date/time string (RFC 3339 subset)
 */
export const ISO8601DateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/,
  'Neplatn├Ż form├ít ISO 8601 (nap┼Ö. "2025-11-21T14:30:00Z")'
);

/**
 * Absolute URL validation
 */
export const AbsoluteURLSchema = z.string().url({ message: 'Mus├ş b├Żt platn├í absolutn├ş URL adresa' });

/**
 * Asset key validation (lowercase alphanumeric with _, -)
 */
export const AssetKeySchema = z.string().regex(
  /^[a-z0-9_-]+$/,
  'Kl├ş─Ź assetu mus├ş obsahovat pouze mal├í p├şsmena, ─Ź├şsla, poml─Źky a podtr┼ż├ştka'
);

/**
 * Plain text (non-empty string)
 */
export const PlainTextSchema = z.string().min(1, 'Text nesm├ş b├Żt pr├ízdn├Ż');

/**
 * Rich content (Markdown, LaTeX, Media Tags)
 */
export const RichContentSchema = z.string().min(1, 'Obsah nesm├ş b├Żt pr├ízdn├Ż');

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
  value: z.string().min(1, 'URI titulk┼» nesm├ş b├Żt pr├ízdn├ę'),
  label: z.string().optional(),
  kind: z.enum(['captions', 'subtitles', 'descriptions']).optional(),
});

/**
 * Media object
 */
export const MediaObjectSchema = z.object({
  type: z.enum(['image', 'audio', 'video', 'model']),
  value: z.string().min(1, 'URI m├ędia nesm├ş b├Żt pr├ízdn├ę'),
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
    message: 'Po─Ź├íte─Źn├ş ─Źas mus├ş b├Żt men┼í├ş ne┼ż koncov├Ż ─Źas',
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
    message: 'Obr├ízky mus├ş m├şt definovan├Ż alternativn├ş text (altText) pro p┼Ö├şstupnost',
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
  email: z.string().email('Neplatn├Ż form├ít e-mailov├ę adresy').optional(),
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
    message: 'Pro typy url, pdf, video, audio a image mus├ş b├Żt value platn├í URL adresa',
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
  wikidataId: z.string().regex(/^Q\d+$/, 'Wikidata ID mus├ş m├şt form├ít Q n├ísledovan├ę ─Ź├şslem').optional(),
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
  features: z.array(z.string().min(1, 'Kl├ş─Ź funkce nesm├ş b├Żt pr├ízdn├Ż')).optional(),
  latexPackages: z.array(z.string().min(1, 'N├ízev bal├ş─Źku nesm├ş b├Żt pr├ízdn├Ż')).optional(),
  itemProperties: z.array(z.string().min(1, 'Kl├ş─Ź vlastnosti nesm├ş b├Żt pr├ízdn├Ż')).optional(),
  metaProperties: z.array(z.string().min(1, 'Kl├ş─Ź vlastnosti nesm├ş b├Żt pr├ízdn├Ż')).optional(),
});

// ============================================================================
// Feature Requirements (legacy ÔÇö kept for backward-compat with requiredFeatures)
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
    message: 'Propriet├írn├ş funkce mus├ş m├şt definovan├Ż vendor (nap┼Ö. "memizy.com")',
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
  irtGuessing: z.number().min(0).max(1, 'IRT guessing mus├ş b├Żt mezi 0 a 1').optional(),
  avgTime: z.number().positive().optional(),
  cognitiveLoad: CognitiveLoadSchema.optional(),
  partialCredit: z.boolean().optional(),
  penaltyPerWrong: z.number().min(0).max(1, 'Penalizace mus├ş b├Żt mezi 0 a 1').optional(),
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
  title: PlainTextSchema.max(500, 'Titulek nesm├ş b├Żt del┼í├ş ne┼ż 500 znak┼»'),
  description: RichContentSchema.max(5000, 'Popis nesm├ş b├Żt del┼í├ş ne┼ż 5000 znak┼»').optional(),
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
    message: 'Minim├íln├ş v─Ťk (ageMin) mus├ş b├Żt men┼í├ş nebo roven maxim├íln├şmu v─Ťku (ageMax)',
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
    message: 'Datum vytvo┼Öen├ş (createdAt) mus├ş b├Żt p┼Öed nebo stejn├ę jako datum aktualizace (updatedAt)',
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
  difficulty: z.number().int().min(1, 'Obt├ş┼żnost mus├ş b├Żt minim├íln─Ť 1').max(5, 'Obt├ş┼żnost mus├ş b├Żt maxim├íln─Ť 5').optional(),
  timeLimit: z.number().positive('─îasov├Ż limit mus├ş b├Żt kladn├ę ─Ź├şslo').optional(),
  hints: z.array(RichContentSchema.max(2000, 'N├ípov─Ťda nesm├ş b├Żt del┼í├ş ne┼ż 2000 znak┼»')).max(20, 'Maxim├íln─Ť 20 n├ípov─Ťd na polo┼żku').optional(),
  explanation: RichContentSchema.max(10000, 'Vysv─Ťtlen├ş nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»').optional(),
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
  options: z.array(RichContentSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 mo┼żnost'),
  correctIndex: z.number().int().nonnegative(),
}).refine(
  (data) => data.correctIndex < data.options.length,
  {
    message: 'Index spr├ívn├ę odpov─Ťdi odkazuje na neexistuj├şc├ş mo┼żnost',
    path: ['correctIndex'],
  }
);

/**
 * Hotspot objects (Discriminated Union)
 */
export const RectHotspotSchema = z.object({
  type: z.literal('rect'),
  label: z.string().optional(),
  x: z.number().min(0).max(100, 'X mus├ş b├Żt v rozmez├ş 0-100%'),
  y: z.number().min(0).max(100, 'Y mus├ş b├Żt v rozmez├ş 0-100%'),
  width: z.number().min(0).max(100, '┼á├ş┼Öka mus├ş b├Żt v rozmez├ş 0-100%'),
  height: z.number().min(0).max(100, 'V├Ż┼íka mus├ş b├Żt v rozmez├ş 0-100%'),
});

export const CircleHotspotSchema = z.object({
  type: z.literal('circle'),
  label: z.string().optional(),
  x: z.number().min(0).max(100, 'X mus├ş b├Żt v rozmez├ş 0-100%'),
  y: z.number().min(0).max(100, 'Y mus├ş b├Żt v rozmez├ş 0-100%'),
  radius: z.number().min(0).max(100, 'Polom─Ťr mus├ş b├Żt v rozmez├ş 0-100%'),
});

export const PolygonHotspotSchema = z.object({
  type: z.literal('polygon'),
  label: z.string().optional(),
  points: z.array(
    z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
  ).min(3, 'Polygon mus├ş m├şt alespo┼ł 3 body'),
});

/**
 * Mesh hotspot ÔÇö references a named node/mesh in a 3D glTF scene.
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
  percentage: z.number().min(0, 'Procenta mus├ş b├Żt nez├íporn├í').max(100, 'Procenta nesm├ş p┼Öes├íhnout 100'),
  description: z.string().optional(),
});

export const RubricSchema = z.object({
  criteria: z.array(RubricCriterionSchema).min(1, 'Rubrika mus├ş m├şt alespo┼ł 1 krit├ęrium'),
}).refine(
  (data) => {
    const sum = data.criteria.reduce((acc, c) => acc + c.percentage, 0);
    return sum > 0;
  },
  {
    message: 'Sou─Źet procent v┼íech krit├ęri├ş mus├ş b├Żt v─Ťt┼í├ş ne┼ż 0',
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
    message: 'Minim├íln├ş hodnota mus├ş b├Żt men┼í├ş nebo rovna maxim├íln├ş hodnot─Ť',
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
  content: RichContentSchema.max(10000, 'Obsah nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
});

/**
 * Flashcard Item
 */
export const FlashcardItemSchema = BaseItemSchema.extend({
  type: z.literal('flashcard'),
  front: RichContentSchema.max(10000, 'P┼Öedn├ş strana nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  back: RichContentSchema.max(10000, 'Zadn├ş strana nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
});

/**
 * True/False Item
 */
export const TrueFalseItemSchema = BaseItemSchema.extend({
  type: z.literal('true-false'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  answer: z.boolean(),
});

/**
 * MCQ Single Item
 */
export const MCQSingleItemSchema = BaseItemSchema.extend({
  type: z.literal('mcq-single'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  options: z.array(RichContentSchema.max(2000, 'Mo┼żnost nesm├ş b├Żt del┼í├ş ne┼ż 2000 znak┼»')).min(2, 'Ot├ízka mus├ş m├şt alespo┼ł 2 mo┼żnosti').max(100, 'Maxim├íln─Ť 100 mo┼żnost├ş'),
  correctIndex: z.number().int().nonnegative(),
  shuffleOptions: z.boolean().optional(),
  optionExplanations: z.array(z.union([RichContentSchema, z.null()])).optional(),
}).refine(
  (data) => data.correctIndex < data.options.length,
  {
    message: 'Index spr├ívn├ę odpov─Ťdi odkazuje na neexistuj├şc├ş mo┼żnost',
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
    message: 'Po─Źet vysv─Ťtlen├ş mo┼żnost├ş mus├ş b├Żt stejn├Ż jako po─Źet mo┼żnost├ş',
    path: ['optionExplanations'],
  }
);

/**
 * MCQ Multi Item
 */
export const MCQMultiItemSchema = BaseItemSchema.extend({
  type: z.literal('mcq-multi'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  options: z.array(RichContentSchema.max(2000, 'Mo┼żnost nesm├ş b├Żt del┼í├ş ne┼ż 2000 znak┼»')).min(2, 'Ot├ízka mus├ş m├şt alespo┼ł 2 mo┼żnosti').max(100, 'Maxim├íln─Ť 100 mo┼żnost├ş'),
  correctIndices: z.array(z.number().int().nonnegative()).min(1, 'Mus├ş b├Żt alespo┼ł 1 spr├ívn├í odpov─Ť─Ć'),
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
    message: 'N─Ťkter├Ż z index┼» spr├ívn├Żch odpov─Ťd├ş odkazuje na neexistuj├şc├ş mo┼żnost',
    path: ['correctIndices'],
  }
).refine(
  (data) => {
    // No duplicate indices
    const unique = new Set(data.correctIndices);
    return unique.size === data.correctIndices.length;
  },
  {
    message: 'Indexy spr├ívn├Żch odpov─Ťd├ş obsahuj├ş duplicity',
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
    message: 'Minim├íln├ş po─Źet v├Żb─Ťr┼» mus├ş b├Żt men┼í├ş nebo roven maxim├íln├şmu po─Źtu',
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
    message: 'Maxim├íln├ş po─Źet v├Żb─Ťr┼» nesm├ş p┼Öes├íhnout po─Źet mo┼żnost├ş',
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
    message: 'Po─Źet vysv─Ťtlen├ş mo┼żnost├ş mus├ş b├Żt stejn├Ż jako po─Źet mo┼żnost├ş',
    path: ['optionExplanations'],
  }
);

/**
 * Short Answer Item
 */
export const ShortAnswerItemSchema = BaseItemSchema.extend({
  type: z.literal('short-answer'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  answers: z.array(PlainTextSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 spr├ívn├í odpov─Ť─Ć'),
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
  text: RichContentSchema.max(10000, 'Text nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  blanks: z.record(z.string(), z.array(PlainTextSchema).min(1, 'Ka┼żd├í mezera mus├ş m├şt alespo┼ł 1 spr├ívnou odpov─Ť─Ć')),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data.blanks).length > 0,
  {
    message: 'Text mus├ş obsahovat alespo┼ł 1 mezeru k dopln─Ťn├ş',
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
    message: 'V┼íechny tokeny v textu mus├ş m├şt definici v blanks a v┼íechny definice mus├ş b├Żt pou┼żity v textu',
    path: ['blanks'],
  }
);

/**
 * Fill in Select Item
 */
export const FillInSelectItemSchema = BaseItemSchema.extend({
  type: z.literal('fill-in-select'),
  question: OptionalRichContentSchema,
  text: RichContentSchema.max(10000, 'Text nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  blanks: z.record(z.string(), SelectBlankObjectSchema),
}).refine(
  (data) => Object.keys(data.blanks).length > 0,
  {
    message: 'Text mus├ş obsahovat alespo┼ł 1 mezeru k v├Żb─Ťru',
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
    message: 'V┼íechny tokeny v textu mus├ş m├şt definici v blanks a v┼íechny definice mus├ş b├Żt pou┼żity v textu',
    path: ['blanks'],
  }
);

/**
 * Match Pairs Item
 */
export const MatchPairsItemSchema = BaseItemSchema.extend({
  type: z.literal('match-pairs'),
  question: OptionalRichContentSchema,
  prompts: z.array(RichContentSchema).min(2, 'Mus├ş b├Żt alespo┼ł 2 p├íry k p┼Öi┼Öazen├ş'),
  matches: z.array(RichContentSchema).min(2, 'Mus├ş b├Żt alespo┼ł 2 p├íry k p┼Öi┼Öazen├ş'),
}).refine(
  (data) => data.prompts.length === data.matches.length,
  {
    message: 'Po─Źet ot├ízek (prompts) mus├ş b├Żt stejn├Ż jako po─Źet odpov─Ťd├ş (matches)',
    path: ['matches'],
  }
);

/**
 * Match Complex Item
 */
export const MatchComplexItemSchema = BaseItemSchema.extend({
  type: z.literal('match-complex'),
  question: OptionalRichContentSchema,
  leftItems: z.array(RichContentSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 polo┼żka vlevo'),
  rightItems: z.array(RichContentSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 polo┼żka vpravo'),
  connections: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])).min(1, 'Mus├ş b├Żt alespo┼ł 1 propojen├ş'),
  minCorrect: z.number().int().positive().optional(),
}).refine(
  (data) => {
    // Validate all connection indices
    return data.connections.every(([left, right]) => 
      left < data.leftItems.length && right < data.rightItems.length
    );
  },
  {
    message: 'N─Ťkter├ę propojen├ş odkazuje na neexistuj├şc├ş polo┼żku',
    path: ['connections'],
  }
).refine(
  (data) => {
    // Check for duplicate connections
    const connectionSet = new Set(data.connections.map(c => `${c[0]}-${c[1]}`));
    return connectionSet.size === data.connections.length;
  },
  {
    message: 'Propojen├ş obsahuj├ş duplicity',
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
    message: 'Minim├íln├ş po─Źet spr├ívn├Żch odpov─Ťd├ş nesm├ş p┼Öes├íhnout celkov├Ż po─Źet propojen├ş',
    path: ['minCorrect'],
  }
);

/**
 * Sort Items Item
 */
export const SortItemsItemSchema = BaseItemSchema.extend({
  type: z.literal('sort-items'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  items: z.array(RichContentSchema).min(2, 'Mus├ş b├Żt alespo┼ł 2 polo┼żky k se┼Öazen├ş'),
});

/**
 * Slider Item
 */
export const SliderItemSchema = BaseItemSchema.extend({
  type: z.literal('slider'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  min: z.number(),
  max: z.number(),
  step: z.number().positive('Krok mus├ş b├Żt kladn├ę ─Ź├şslo'),
  correctAnswer: z.number(),
  tolerance: z.number().nonnegative('Tolerance mus├ş b├Żt nez├íporn├í'),
  unit: z.string().optional(),
}).refine(
  (data) => data.min < data.max,
  {
    message: 'Minim├íln├ş hodnota mus├ş b├Żt men┼í├ş ne┼ż maxim├íln├ş hodnota',
    path: ['max'],
  }
).refine(
  (data) => data.correctAnswer >= data.min && data.correctAnswer <= data.max,
  {
    message: 'Spr├ívn├í odpov─Ť─Ć mus├ş b├Żt v rozmez├ş min-max',
    path: ['correctAnswer'],
  }
).refine(
  (data) => {
    // Check if correctAnswer is reachable by step
    const steps = (data.correctAnswer - data.min) / data.step;
    return Math.abs(steps - Math.round(steps)) < 0.0001;
  },
  {
    message: 'Spr├ívn├í odpov─Ť─Ć mus├ş b├Żt dosa┼żiteln├í pomoc├ş definovan├ęho kroku',
    path: ['correctAnswer'],
  }
).refine(
  (data) => data.tolerance <= (data.max - data.min) / 2,
  {
    message: 'Tolerance nesm├ş b├Żt v─Ťt┼í├ş ne┼ż polovina rozsahu hodnot',
    path: ['tolerance'],
  }
);

/**
 * Pin on Image Item
 */
export const PinOnImageItemSchema = BaseItemSchema.extend({
  type: z.literal('pin-on-image'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  targetAsset: AssetKeySchema,
  hotspots: z.array(HotspotObjectSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 hotspot'),
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
    message: 'Minim├íln├ş po─Źet spr├ívn├Żch odpov─Ťd├ş nesm├ş p┼Öes├íhnout po─Źet hotspot┼»',
    path: ['minCorrect'],
  }
);

/**
 * Categorize Item
 */
export const CategorizeItemTypeSchema = BaseItemSchema.extend({
  type: z.literal('categorize'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  categories: z.array(PlainTextSchema).min(2, 'Mus├ş b├Żt alespo┼ł 2 kategorie'),
  items: z.array(CategorizeItemSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 polo┼żka ke kategorizaci'),
}).refine(
  (data) => {
    // Validate all correctCategoryIndex values
    return data.items.every(item => item.correctCategoryIndex < data.categories.length);
  },
  {
    message: 'N─Ťkter├í polo┼żka odkazuje na neexistuj├şc├ş kategorii',
    path: ['items'],
  }
);

/**
 * Timeline Item
 */
export const TimelineItemSchema = BaseItemSchema.extend({
  type: z.literal('timeline'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  events: z.array(TimelineEventSchema).min(2, 'Mus├ş b├Żt alespo┼ł 2 ud├ílosti'),
  randomize: z.boolean().optional(),
});

/**
 * Matrix Item
 */
export const MatrixItemSchema = BaseItemSchema.extend({
  type: z.literal('matrix'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  rows: z.array(PlainTextSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 ┼Ö├ídek'),
  columns: z.array(PlainTextSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 sloupec'),
  correctCells: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])).min(1, 'Mus├ş b├Żt alespo┼ł 1 spr├ívn├í bu┼łka'),
  multiplePerRow: z.boolean().optional(),
}).refine(
  (data) => {
    // Validate all cell coordinates
    return data.correctCells.every(([row, col]) => 
      row < data.rows.length && col < data.columns.length
    );
  },
  {
    message: 'N─Ťkter├ę sou┼Öadnice bu┼łky odkazuj├ş na neexistuj├şc├ş ┼Ö├ídek nebo sloupec',
    path: ['correctCells'],
  }
).refine(
  (data) => {
    // Check for duplicate cells
    const cellSet = new Set(data.correctCells.map(c => `${c[0]}-${c[1]}`));
    return cellSet.size === data.correctCells.length;
  },
  {
    message: 'Spr├ívn├ę bu┼łky obsahuj├ş duplicity',
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
    message: 'Pokud multiplePerRow je false, ka┼żd├Ż ┼Ö├ídek sm├ş m├şt maxim├íln─Ť 1 spr├ívnou bu┼łku',
    path: ['correctCells'],
  }
);

/**
 * Math Input Item
 */
export const MathInputItemSchema = BaseItemSchema.extend({
  type: z.literal('math-input'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  correctAnswer: PlainTextSchema,
  alternativeAnswers: z.array(PlainTextSchema).optional(),
  tolerance: z.number().nonnegative().optional(),
});

/**
 * Diagram Label Item
 */
export const DiagramLabelItemSchema = BaseItemSchema.extend({
  type: z.literal('diagram-label'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  targetAsset: AssetKeySchema,
  labels: z.array(RichContentSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 ┼ít├ştek'),
  caseSensitive: z.boolean().optional(),
  requireTyping: z.boolean().optional(),
  zones: z.array(DiagramZoneSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 z├│na'),
}).refine(
  (data) => {
    // Validate all correctLabelIndex values
    return data.zones.every(zone => zone.correctLabelIndex < data.labels.length);
  },
  {
    message: 'N─Ťkter├í z├│na odkazuje na neexistuj├şc├ş ┼ít├ştek',
    path: ['zones'],
  }
);

/**
 * Open Ended Item
 */
export const OpenEndedItemSchema = BaseItemSchema.extend({
  type: z.literal('open-ended'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
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
    message: 'Minim├íln├ş po─Źet slov mus├ş b├Żt men┼í├ş nebo roven maxim├íln├şmu po─Źtu',
    path: ['maxWords'],
  }
);

/**
 * Numeric Input Item
 */
export const NumericInputItemSchema = BaseItemSchema.extend({
  type: z.literal('numeric-input'),
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
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
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  targetAsset: AssetKeySchema,
  hotspots: z.array(MeshHotspotSchema).min(1, 'Mus├ş b├Żt alespo┼ł 1 hotspot'),
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
    message: 'Minim├íln├ş po─Źet spr├ívn├Żch odpov─Ťd├ş nesm├ş p┼Öes├íhnout po─Źet hotspot┼»',
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
  question: RichContentSchema.max(10000, 'Ot├ízka nesm├ş b├Żt del┼í├ş ne┼ż 10000 znak┼»'),
  fen: PlainTextSchema,
  answers: z
    .array(
      z.array(PlainTextSchema).min(1, 'Sekvence tah┼» nesm├ş b├Żt pr├ízdn├í')
    )
    .min(1, 'Mus├ş b├Żt alespo┼ł 1 spr├ívn├í sekvence tah┼»'),
  elo: z.number().int().nonnegative('ELO mus├ş b├Żt nez├íporn├ę cel├ę ─Ź├şslo').optional(),
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
  $schema: z.string().url().optional(),
  version: z.string().regex(/^\d+\.\d+$/, 'Verze mus├ş b├Żt ve form├ítu "X.Y" (nap┼Ö. "1.0")'),
  meta: OQSEMetaSchema,
  items: z.array(OQSEItemSchema).max(10000, 'Maxim├íln─Ť 10000 polo┼żek na sadu'),
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
    message: 'N─Ťkter├í polo┼żka odkazuje na neexistuj├şc├ş relatedItems nebo dependencyItems',
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
    message: 'Thumbnail odkazuje na neexistuj├şc├ş asset',
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
    message: 'N─Ťkter├í polo┼żka odkazuje na neexistuj├şc├ş source material',
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
    const path = err.path.join(' Ôćĺ ');
    return path ? `${path}: ${err.message}` : err.message;
  });
}
