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

// ============================================================================
// Reusable Primitives
// ============================================================================

/**
 * UUID validation (accepts UUIDv4 and UUIDv7)
 */
export const UUIDSchema = z.string().uuid({ message: 'Neplatný formát UUID' });

/**
 * BCP 47 language code (e.g., "en", "en-US", "cs", "zh-Hans")
 */
export const LanguageCodeSchema = z.string().min(2, 'Kód jazyka musí mít alespoň 2 znaky').regex(
  /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/,
  'Neplatný formát BCP 47 (např. "cs", "en-US")'
);

/**
 * SPDX license identifier
 */
export const SPDXLicenseSchema = z.string().min(1, 'Identifikátor licence nesmí být prázdný');

/**
 * ISO 8601 date/time string (RFC 3339 subset)
 */
export const ISO8601DateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/,
  'Neplatný formát ISO 8601 (např. "2025-11-21T14:30:00Z")'
);

/**
 * Absolute URL validation
 */
export const AbsoluteURLSchema = z.string().url({ message: 'Musí být platná absolutní URL adresa' });

/**
 * Asset key validation (lowercase alphanumeric with _, -)
 */
export const AssetKeySchema = z.string().regex(
  /^[a-z0-9_-]+$/,
  'Klíč assetu musí obsahovat pouze malá písmena, čísla, pomlčky a podtržítka'
);

/**
 * Plain text (non-empty string)
 */
export const PlainTextSchema = z.string().min(1, 'Text nesmí být prázdný');

/**
 * Rich content (Markdown, LaTeX, Media Tags)
 */
export const RichContentSchema = z.string().min(1, 'Obsah nesmí být prázdný');

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
  value: z.string().min(1, 'URI titulků nesmí být prázdné'),
  label: z.string().optional(),
  kind: z.enum(['captions', 'subtitles', 'descriptions']).optional(),
});

/**
 * Media object
 */
export const MediaObjectSchema = z.object({
  type: z.enum(['image', 'audio', 'video', 'model']),
  value: z.string().min(1, 'URI média nesmí být prázdné'),
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
    message: 'Počáteční čas musí být menší než koncový čas',
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
    message: 'Obrázky musí mít definovaný alternativní text (altText) pro přístupnost',
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
  email: z.string().email('Neplatný formát e-mailové adresy').optional(),
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
    message: 'Pro typy url, pdf, video, audio a image musí být value platná URL adresa',
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
  wikidataId: z.string().regex(/^Q\d+$/, 'Wikidata ID musí mít formát Q následované číslem').optional(),
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
  features: z.array(z.string().min(1, 'Klíč funkce nesmí být prázdný')).optional(),
  latexPackages: z.array(z.string().min(1, 'Název balíčku nesmí být prázdný')).optional(),
  itemProperties: z.array(z.string().min(1, 'Klíč vlastnosti nesmí být prázdný')).optional(),
  metaProperties: z.array(z.string().min(1, 'Klíč vlastnosti nesmí být prázdný')).optional(),
});

// ============================================================================
// Feature Requirements (legacy — kept for backward-compat with requiredFeatures)
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
    message: 'Proprietární funkce musí mít definovaný vendor (např. "memizy.com")',
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
  irtGuessing: z.number().min(0).max(1, 'IRT guessing musí být mezi 0 a 1').optional(),
  avgTime: z.number().positive().optional(),
  cognitiveLoad: CognitiveLoadSchema.optional(),
  partialCredit: z.boolean().optional(),
  penaltyPerWrong: z.number().min(0).max(1, 'Penalizace musí být mezi 0 a 1').optional(),
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
  title: PlainTextSchema.max(500, 'Titulek nesmí být delší než 500 znaků'),
  description: RichContentSchema.max(5000, 'Popis nesmí být delší než 5000 znaků').optional(),
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
    message: 'Minimální věk (ageMin) musí být menší nebo roven maximálnímu věku (ageMax)',
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
    message: 'Datum vytvoření (createdAt) musí být před nebo stejné jako datum aktualizace (updatedAt)',
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
  difficulty: z.number().int().min(1, 'Obtížnost musí být minimálně 1').max(5, 'Obtížnost musí být maximálně 5').optional(),
  timeLimit: z.number().positive('Časový limit musí být kladné číslo').optional(),
  hints: z.array(RichContentSchema.max(2000, 'Nápověda nesmí být delší než 2000 znaků')).max(20, 'Maximálně 20 nápověd na položku').optional(),
  explanation: RichContentSchema.max(10000, 'Vysvětlení nesmí být delší než 10000 znaků').optional(),
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
  options: z.array(RichContentSchema).min(1, 'Musí být alespoň 1 možnost'),
  correctIndex: z.number().int().nonnegative(),
}).refine(
  (data) => data.correctIndex < data.options.length,
  {
    message: 'Index správné odpovědi odkazuje na neexistující možnost',
    path: ['correctIndex'],
  }
);

/**
 * Hotspot objects (Discriminated Union)
 */
export const RectHotspotSchema = z.object({
  type: z.literal('rect'),
  label: z.string().optional(),
  x: z.number().min(0).max(100, 'X musí být v rozmezí 0-100%'),
  y: z.number().min(0).max(100, 'Y musí být v rozmezí 0-100%'),
  width: z.number().min(0).max(100, 'Šířka musí být v rozmezí 0-100%'),
  height: z.number().min(0).max(100, 'Výška musí být v rozmezí 0-100%'),
});

export const CircleHotspotSchema = z.object({
  type: z.literal('circle'),
  label: z.string().optional(),
  x: z.number().min(0).max(100, 'X musí být v rozmezí 0-100%'),
  y: z.number().min(0).max(100, 'Y musí být v rozmezí 0-100%'),
  radius: z.number().min(0).max(100, 'Poloměr musí být v rozmezí 0-100%'),
});

export const PolygonHotspotSchema = z.object({
  type: z.literal('polygon'),
  label: z.string().optional(),
  points: z.array(
    z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
  ).min(3, 'Polygon musí mít alespoň 3 body'),
});

/**
 * Mesh hotspot — references a named node/mesh in a 3D glTF scene.
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
  percentage: z.number().min(0, 'Procenta musí být nezáporná').max(100, 'Procenta nesmí přesáhnout 100'),
  description: z.string().optional(),
});

export const RubricSchema = z.object({
  criteria: z.array(RubricCriterionSchema).min(1, 'Rubrika musí mít alespoň 1 kritérium'),
}).refine(
  (data) => {
    const sum = data.criteria.reduce((acc, c) => acc + c.percentage, 0);
    return sum > 0;
  },
  {
    message: 'Součet procent všech kritérií musí být větší než 0',
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
    message: 'Minimální hodnota musí být menší nebo rovna maximální hodnotě',
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
  content: RichContentSchema.max(10000, 'Obsah nesmí být delší než 10000 znaků'),
});

/**
 * Flashcard Item
 */
export const FlashcardItemSchema = BaseItemSchema.extend({
  type: z.literal('flashcard'),
  front: RichContentSchema.max(10000, 'Přední strana nesmí být delší než 10000 znaků'),
  back: RichContentSchema.max(10000, 'Zadní strana nesmí být delší než 10000 znaků'),
});

/**
 * True/False Item
 */
export const TrueFalseItemSchema = BaseItemSchema.extend({
  type: z.literal('true-false'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  answer: z.boolean(),
});

/**
 * MCQ Single Item
 */
export const MCQSingleItemSchema = BaseItemSchema.extend({
  type: z.literal('mcq-single'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  options: z.array(RichContentSchema.max(2000, 'Možnost nesmí být delší než 2000 znaků')).min(2, 'Otázka musí mít alespoň 2 možnosti').max(100, 'Maximálně 100 možností'),
  correctIndex: z.number().int().nonnegative(),
  shuffleOptions: z.boolean().optional(),
  optionExplanations: z.array(z.union([RichContentSchema, z.null()])).optional(),
}).refine(
  (data) => data.correctIndex < data.options.length,
  {
    message: 'Index správné odpovědi odkazuje na neexistující možnost',
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
    message: 'Počet vysvětlení možností musí být stejný jako počet možností',
    path: ['optionExplanations'],
  }
);

/**
 * MCQ Multi Item
 */
export const MCQMultiItemSchema = BaseItemSchema.extend({
  type: z.literal('mcq-multi'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  options: z.array(RichContentSchema.max(2000, 'Možnost nesmí být delší než 2000 znaků')).min(2, 'Otázka musí mít alespoň 2 možnosti').max(100, 'Maximálně 100 možností'),
  correctIndices: z.array(z.number().int().nonnegative()).min(1, 'Musí být alespoň 1 správná odpověď'),
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
    message: 'Některý z indexů správných odpovědí odkazuje na neexistující možnost',
    path: ['correctIndices'],
  }
).refine(
  (data) => {
    // No duplicate indices
    const unique = new Set(data.correctIndices);
    return unique.size === data.correctIndices.length;
  },
  {
    message: 'Indexy správných odpovědí obsahují duplicity',
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
    message: 'Minimální počet výběrů musí být menší nebo roven maximálnímu počtu',
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
    message: 'Maximální počet výběrů nesmí přesáhnout počet možností',
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
    message: 'Počet vysvětlení možností musí být stejný jako počet možností',
    path: ['optionExplanations'],
  }
);

/**
 * Short Answer Item
 */
export const ShortAnswerItemSchema = BaseItemSchema.extend({
  type: z.literal('short-answer'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  answers: z.array(PlainTextSchema).min(1, 'Musí být alespoň 1 správná odpověď'),
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
  text: RichContentSchema.max(10000, 'Text nesmí být delší než 10000 znaků'),
  blanks: z.record(z.string(), z.array(PlainTextSchema).min(1, 'Každá mezera musí mít alespoň 1 správnou odpověď')),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data.blanks).length > 0,
  {
    message: 'Text musí obsahovat alespoň 1 mezeru k doplnění',
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
    message: 'Všechny tokeny v textu musí mít definici v blanks a všechny definice musí být použity v textu',
    path: ['blanks'],
  }
);

/**
 * Fill in Select Item
 */
export const FillInSelectItemSchema = BaseItemSchema.extend({
  type: z.literal('fill-in-select'),
  question: OptionalRichContentSchema,
  text: RichContentSchema.max(10000, 'Text nesmí být delší než 10000 znaků'),
  blanks: z.record(z.string(), SelectBlankObjectSchema),
}).refine(
  (data) => Object.keys(data.blanks).length > 0,
  {
    message: 'Text musí obsahovat alespoň 1 mezeru k výběru',
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
    message: 'Všechny tokeny v textu musí mít definici v blanks a všechny definice musí být použity v textu',
    path: ['blanks'],
  }
);

/**
 * Match Pairs Item
 */
export const MatchPairsItemSchema = BaseItemSchema.extend({
  type: z.literal('match-pairs'),
  question: OptionalRichContentSchema,
  prompts: z.array(RichContentSchema).min(2, 'Musí být alespoň 2 páry k přiřazení'),
  matches: z.array(RichContentSchema).min(2, 'Musí být alespoň 2 páry k přiřazení'),
}).refine(
  (data) => data.prompts.length === data.matches.length,
  {
    message: 'Počet otázek (prompts) musí být stejný jako počet odpovědí (matches)',
    path: ['matches'],
  }
);

/**
 * Match Complex Item
 */
export const MatchComplexItemSchema = BaseItemSchema.extend({
  type: z.literal('match-complex'),
  question: OptionalRichContentSchema,
  leftItems: z.array(RichContentSchema).min(1, 'Musí být alespoň 1 položka vlevo'),
  rightItems: z.array(RichContentSchema).min(1, 'Musí být alespoň 1 položka vpravo'),
  connections: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])).min(1, 'Musí být alespoň 1 propojení'),
  minCorrect: z.number().int().positive().optional(),
}).refine(
  (data) => {
    // Validate all connection indices
    return data.connections.every(([left, right]) => 
      left < data.leftItems.length && right < data.rightItems.length
    );
  },
  {
    message: 'Některé propojení odkazuje na neexistující položku',
    path: ['connections'],
  }
).refine(
  (data) => {
    // Check for duplicate connections
    const connectionSet = new Set(data.connections.map(c => `${c[0]}-${c[1]}`));
    return connectionSet.size === data.connections.length;
  },
  {
    message: 'Propojení obsahují duplicity',
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
    message: 'Minimální počet správných odpovědí nesmí přesáhnout celkový počet propojení',
    path: ['minCorrect'],
  }
);

/**
 * Sort Items Item
 */
export const SortItemsItemSchema = BaseItemSchema.extend({
  type: z.literal('sort-items'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  items: z.array(RichContentSchema).min(2, 'Musí být alespoň 2 položky k seřazení'),
});

/**
 * Slider Item
 */
export const SliderItemSchema = BaseItemSchema.extend({
  type: z.literal('slider'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  min: z.number(),
  max: z.number(),
  step: z.number().positive('Krok musí být kladné číslo'),
  correctAnswer: z.number(),
  tolerance: z.number().nonnegative('Tolerance musí být nezáporná'),
  unit: z.string().optional(),
}).refine(
  (data) => data.min < data.max,
  {
    message: 'Minimální hodnota musí být menší než maximální hodnota',
    path: ['max'],
  }
).refine(
  (data) => data.correctAnswer >= data.min && data.correctAnswer <= data.max,
  {
    message: 'Správná odpověď musí být v rozmezí min-max',
    path: ['correctAnswer'],
  }
).refine(
  (data) => {
    // Check if correctAnswer is reachable by step
    const steps = (data.correctAnswer - data.min) / data.step;
    return Math.abs(steps - Math.round(steps)) < 0.0001;
  },
  {
    message: 'Správná odpověď musí být dosažitelná pomocí definovaného kroku',
    path: ['correctAnswer'],
  }
).refine(
  (data) => data.tolerance <= (data.max - data.min) / 2,
  {
    message: 'Tolerance nesmí být větší než polovina rozsahu hodnot',
    path: ['tolerance'],
  }
);

/**
 * Pin on Image Item
 */
export const PinOnImageItemSchema = BaseItemSchema.extend({
  type: z.literal('pin-on-image'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  targetAsset: AssetKeySchema,
  hotspots: z.array(HotspotObjectSchema).min(1, 'Musí být alespoň 1 hotspot'),
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
    message: 'Minimální počet správných odpovědí nesmí přesáhnout počet hotspotů',
    path: ['minCorrect'],
  }
);

/**
 * Categorize Item
 */
export const CategorizeItemTypeSchema = BaseItemSchema.extend({
  type: z.literal('categorize'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  categories: z.array(PlainTextSchema).min(2, 'Musí být alespoň 2 kategorie'),
  items: z.array(CategorizeItemSchema).min(1, 'Musí být alespoň 1 položka ke kategorizaci'),
}).refine(
  (data) => {
    // Validate all correctCategoryIndex values
    return data.items.every(item => item.correctCategoryIndex < data.categories.length);
  },
  {
    message: 'Některá položka odkazuje na neexistující kategorii',
    path: ['items'],
  }
);

/**
 * Timeline Item
 */
export const TimelineItemSchema = BaseItemSchema.extend({
  type: z.literal('timeline'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  events: z.array(TimelineEventSchema).min(2, 'Musí být alespoň 2 události'),
  randomize: z.boolean().optional(),
});

/**
 * Matrix Item
 */
export const MatrixItemSchema = BaseItemSchema.extend({
  type: z.literal('matrix'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  rows: z.array(PlainTextSchema).min(1, 'Musí být alespoň 1 řádek'),
  columns: z.array(PlainTextSchema).min(1, 'Musí být alespoň 1 sloupec'),
  correctCells: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])).min(1, 'Musí být alespoň 1 správná buňka'),
  multiplePerRow: z.boolean().optional(),
}).refine(
  (data) => {
    // Validate all cell coordinates
    return data.correctCells.every(([row, col]) => 
      row < data.rows.length && col < data.columns.length
    );
  },
  {
    message: 'Některé souřadnice buňky odkazují na neexistující řádek nebo sloupec',
    path: ['correctCells'],
  }
).refine(
  (data) => {
    // Check for duplicate cells
    const cellSet = new Set(data.correctCells.map(c => `${c[0]}-${c[1]}`));
    return cellSet.size === data.correctCells.length;
  },
  {
    message: 'Správné buňky obsahují duplicity',
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
    message: 'Pokud multiplePerRow je false, každý řádek smí mít maximálně 1 správnou buňku',
    path: ['correctCells'],
  }
);

/**
 * Math Input Item
 */
export const MathInputItemSchema = BaseItemSchema.extend({
  type: z.literal('math-input'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  correctAnswer: PlainTextSchema,
  alternativeAnswers: z.array(PlainTextSchema).optional(),
  tolerance: z.number().nonnegative().optional(),
});

/**
 * Diagram Label Item
 */
export const DiagramLabelItemSchema = BaseItemSchema.extend({
  type: z.literal('diagram-label'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  targetAsset: AssetKeySchema,
  labels: z.array(RichContentSchema).min(1, 'Musí být alespoň 1 štítek'),
  caseSensitive: z.boolean().optional(),
  requireTyping: z.boolean().optional(),
  zones: z.array(DiagramZoneSchema).min(1, 'Musí být alespoň 1 zóna'),
}).refine(
  (data) => {
    // Validate all correctLabelIndex values
    return data.zones.every(zone => zone.correctLabelIndex < data.labels.length);
  },
  {
    message: 'Některá zóna odkazuje na neexistující štítek',
    path: ['zones'],
  }
);

/**
 * Open Ended Item
 */
export const OpenEndedItemSchema = BaseItemSchema.extend({
  type: z.literal('open-ended'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
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
    message: 'Minimální počet slov musí být menší nebo roven maximálnímu počtu',
    path: ['maxWords'],
  }
);

/**
 * Numeric Input Item
 */
export const NumericInputItemSchema = BaseItemSchema.extend({
  type: z.literal('numeric-input'),
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
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
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  targetAsset: AssetKeySchema,
  hotspots: z.array(MeshHotspotSchema).min(1, 'Musí být alespoň 1 hotspot'),
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
    message: 'Minimální počet správných odpovědí nesmí přesáhnout počet hotspotů',
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
  question: RichContentSchema.max(10000, 'Otázka nesmí být delší než 10000 znaků'),
  fen: PlainTextSchema,
  answers: z
    .array(
      z.array(PlainTextSchema).min(1, 'Sekvence tahů nesmí být prázdná')
    )
    .min(1, 'Musí být alespoň 1 správná sekvence tahů'),
  elo: z.number().int().nonnegative('ELO musí být nezáporné celé číslo').optional(),
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
  version: z.string().regex(/^\d+\.\d+$/, 'Verze musí být ve formátu "X.Y" (např. "1.0")'),
  meta: OQSEMetaSchema,
  items: z.array(OQSEItemSchema).max(10000, 'Maximálně 10000 položek na sadu'),
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
    message: 'Některá položka odkazuje na neexistující relatedItems nebo dependencyItems',
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
    message: 'Thumbnail odkazuje na neexistující asset',
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
    message: 'Některá položka odkazuje na neexistující source material',
    path: ['items'],
  }
);

// ============================================================================
// Type Inference (Export TypeScript Types)
// ============================================================================

export type OQSEFile = z.infer<typeof OQSEFileSchema>;
export type OQSEMeta = z.infer<typeof OQSEMetaSchema>;
export type OQSEItem = z.infer<typeof OQSEItemSchema>;
export type MediaObject = z.infer<typeof MediaObjectSchema>;
export type PersonObject = z.infer<typeof PersonObjectSchema>;
export type SourceMaterial = z.infer<typeof SourceMaterialSchema>;
export type SourceReference = z.infer<typeof SourceReferenceSchema>;
export type FeatureRequirement = z.infer<typeof FeatureRequirementSchema>;
export type FeatureProfile = z.infer<typeof FeatureProfileSchema>;
export type Pedagogy = z.infer<typeof PedagogySchema>;

// Item type exports
export type NoteItem = z.infer<typeof NoteItemSchema>;
export type FlashcardItem = z.infer<typeof FlashcardItemSchema>;
export type TrueFalseItem = z.infer<typeof TrueFalseItemSchema>;
export type MCQSingleItem = z.infer<typeof MCQSingleItemSchema>;
export type MCQMultiItem = z.infer<typeof MCQMultiItemSchema>;
export type ShortAnswerItem = z.infer<typeof ShortAnswerItemSchema>;
export type FillInBlanksItem = z.infer<typeof FillInBlanksItemSchema>;
export type FillInSelectItem = z.infer<typeof FillInSelectItemSchema>;
export type MatchPairsItem = z.infer<typeof MatchPairsItemSchema>;
export type MatchComplexItem = z.infer<typeof MatchComplexItemSchema>;
export type SortItemsItem = z.infer<typeof SortItemsItemSchema>;
export type SliderItem = z.infer<typeof SliderItemSchema>;
export type PinOnImageItem = z.infer<typeof PinOnImageItemSchema>;
export type CategorizeItemType = z.infer<typeof CategorizeItemTypeSchema>;
export type TimelineItem = z.infer<typeof TimelineItemSchema>;
export type MatrixItem = z.infer<typeof MatrixItemSchema>;
export type MathInputItem = z.infer<typeof MathInputItemSchema>;
export type DiagramLabelItem = z.infer<typeof DiagramLabelItemSchema>;
export type OpenEndedItem = z.infer<typeof OpenEndedItemSchema>;
export type NumericInputItem = z.infer<typeof NumericInputItemSchema>;
export type PinOnModelItem = z.infer<typeof PinOnModelItemSchema>;
export type ChessPuzzleItem = z.infer<typeof ChessPuzzleItemSchema>;

// Helper type exports
export type HotspotObject = z.infer<typeof HotspotObjectSchema>;
export type MeshHotspot = z.infer<typeof MeshHotspotSchema>;
export type Vector3 = z.infer<typeof Vector3Schema>;
export type CameraSetup = z.infer<typeof CameraSetupSchema>;
export type SelectBlankObject = z.infer<typeof SelectBlankObjectSchema>;
export type CategorizeItem = z.infer<typeof CategorizeItemSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;
export type Rubric = z.infer<typeof RubricSchema>;

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
    const path = err.path.join(' → ');
    return path ? `${path}: ${err.message}` : err.message;
  });
}