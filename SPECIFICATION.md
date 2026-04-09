# OQSE v0.1 Specification (Open Quiz & Study Exchange)

**OQSE** (Open Quiz & Study Exchange) is an open, JSON-based format designed for easy creation, sharing, and importing of study sets. It is designed with emphasis on flexibility, extensibility, semantic interoperability, legal clarity, and backward compatibility.

### Keywords per RFC 2119

In this specification, the keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are interpreted according to [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119):

- **MUST** / **REQUIRED**: An absolute requirement of the specification.
- **MUST NOT**: An absolute prohibition.
- **SHOULD** / **RECOMMENDED**: There may be reasons to ignore, but consequences must be understood.
- **SHOULD NOT**: There may be reasons to accept, but consequences must be understood.
- **MAY** / **OPTIONAL**: Truly optional.

**Note on Tables:** In columns labeled "Required," "Yes" = MUST be present (per RFC 2119), "No" = MAY be omitted.

**Implementation Terminology:**
- **Application:** Any software entity that interacts with OQSE data. Every application declares its specific **Capabilities** via a Manifest.
- **Capability:** A specifically declared competence of an application. This encompasses the actions it can perform (e.g., `render`, `edit`, `export`), the item types and asset formats it supports (e.g., `mcq-single`, `image/png`), and the advanced features (e.g., `explanations`, `sourceMaterials`) or metadata it can process (e.g., `markdown`, `math`).
- **Rule Application:** When the specification states "Application MUST...", the rule applies contextually based on the application's declared capabilities. For example, rules regarding UI display and tolerant parsing apply to applications declaring the `render` action, whereas strict data normalization rules during saving apply to those declaring `edit` or `export`.


## Table of Contents

*   [1. Global Rules and Root Structure](#1-global-rules-and-root-structure)
*   [2. Capability-Based Interoperability, Application Manifest & Progress Data](#2-capability-based-interoperability-application-manifest--progress-data)
*   [3. The `meta` Object](#3-the-meta-object)
*   [4. Common Item Properties](#4-common-item-properties-in-items)
*   [5. The `MediaObject` Object](#5-the-mediaobject-object)
*   [6. Item Types](#6-item-types-itemtype)
*   [7. Helper Data Structures](#7-helper-data-structures)
*   [8. Complete Example File](#8-complete-example-file)
*   [9. Validation Rules and Constraints](#9-validation-rules-and-constraints)
*   [10. Error Handling](#10-error-handling-error-handling-policy)
*   [11. Extensibility and Versioning](#11-extensibility-and-versioning)
*   [12. Best Practices](#12-best-practices-for-set-creators)
*   [13. Validation and Tools](#13-validation-and-tools)
*   [14. Contributing and Community](#14-contributing-and-community)

## 1. Global Rules and Root Structure

  * **File Format:** JSON (`.json`)
  * **MIME Types:**
    * Standalone JSON file: `application/vnd.oqse+json`
    * OQSE container (ZIP): `application/vnd.oqse+zip`
    * For HTTP `Content-Type` header, use the appropriate MIME type
  * **Text Encoding:** UTF-8 (REQUIRED, without BOM)
  * **Validation:** Every OQSE file SHOULD be valid according to the JSON Schema at the URI specified in `$schema`
  * **Unique IDs:** All `id` values MUST be generated as **UUIDv7** to ensure global uniqueness and native temporal ordering of records in databases. Applications MUST accept UUID versions 4 and 7 when loading existing sets. Applications MAY accept other versions (1-6), but this is not required. Applications creating new items MUST use UUIDv7. When re-exporting an existing set, the original UUID MUST be preserved regardless of version. Validation checks only the format (8-4-4-4-12 hex characters), not the specific UUID version. Exception: `SourceMaterial.id` MAY be an alphanumeric string unique only within that file, and `id` within internal item objects such as `TimelineEvent` or `CategorizeItem` MAY also be an alphanumeric string.
  * **Text Formatting:** The specification distinguishes two types of text fields:
    * **Plain Text:** Fields intended for metadata and identifiers (e.g., titles, tags, alt texts). Interpreted as plain text without any formatting.
    * **Rich Content:** Fields intended for educational content. Support **GitHub Flavored Markdown (GFM)**, **LaTeX** mathematics compatible with KaTeX/MathJax (inline `$x^2$` and blocks `$$...$$` rendered as display style on a separate line), and media references using Media Tag syntax `<asset:key />`.
  * **Media Embedding System (Assets):** The format uses a centralized "assets" system for embedding media in Rich Content fields. Media are defined in `item.assets` and referenced using the special tag `<asset:key />`. **[(See section 5.1 for details)](#51-media-reference-syntax-media-tags)**.
  * **Backward Compatibility:** Applications MUST ignore unknown keys (forward compatibility). New specification versions MUST NOT change the meaning of existing keys within the same MAJOR version.
  * **Case Sensitivity of Files:** All keys in `assets` and filenames within the OQSE container (ZIP) MUST be written in lowercase. Application MUST immediately convert all filenames and asset keys to lowercase during import (with a warning on change) and MUST reject colliding names that match after conversion. On export, only lowercase names may be generated. References `<asset:... />` are case-insensitive; applications MUST convert the token to lowercase before lookup to maintain consistency across platforms.

**Note on Field Types:** Throughout the specification, each text field is explicitly marked as either "Plain Text" or "Rich Content."

### 1.1 Distribution Formats

An OQSE set MAY be distributed in two ways:

1. **Standalone JSON file (`.oqse.json` or `.json`)**
  * Suitable for sets whose media are hosted on public URLs or use no media.
  * For standalone JSON files, `MediaObject.value` MUST contain an absolute URL [(see section 9.4)](#94-uri-and-path-security-validation-rules).
  * RECOMMENDED MIME type for HTTP transmission: `application/json` (custom APIs MAY use `application/vnd.oqse+json` for strict content negotiation).

2. **OQSE container (`.oqse`)**
  * Technically a ZIP archive with MIME type `application/vnd.oqse+zip`.
  * **OQSE container structure:**
    ```
    archive.oqse
    ├── index.json         (REQUIRED)
    ├── assets/            (OPTIONAL)
    │   ├── images/
    │   ├── audio/
    │   └── ...
    └── [other files]      (IGNORED)
    ```
  * `index.json` references local media using relative paths (e.g., `assets/audio/countdown.mp3`). Relative paths MUST NOT contain `..` or start with `/`.
  * Hierarchy within `assets/` is flexible, but all files MUST be within this folder (e.g., `assets/images/diagram.png`).
  * ZIP MUST NOT contain executable files or scripts. It is recommended to apply SHA-256 `checksum` for each asset [(see section 5)](#5-the-mediaobject-object).
  * **Application MUST:**
    * Load `index.json` from the root
    * Load files from `assets/` according to JSON references
    * IGNORE all other files (e.g., OS metadata, `.DS_Store`, thumbnails)
    * MUST NOT fail due to the presence of other files

Exporters should choose `.json` if the set does not need local binary files. Once a set contains custom media (e.g., user-uploaded), the editor MUST create a `.oqse` package [(see section 2.3)](#23-the-handshake-matching-process).

-----

### 1.2 Root Structure

The root object of an OQSE file consists of 4 keys:

```json
{
  "$schema": "https://memizy.com/schemas/oqse/v0.1.json",
  "version": "0.1",
  "meta": { ... },
  "items": [ ... ]
}
```

  * `$schema` (string): **Recommended.** URL reference to the JSON Schema specification for automatic validation.
  * `version` (string): **Required.** Version of the OQSE specification (e.g., "1.0").
  * `meta` (object): **Required.** Object containing metadata about the entire set. [See section 3](#3-the-meta-object).
  * `items` (array): **Required.** Array containing individual study items. May be empty (e.g., for a template or work-in-progress set). [See section 4](#4-common-item-properties-in-items).

-----

## 2. Capability-Based Interoperability, Application Manifest & Progress Data

OQSE v0.1 uses a **capability-based negotiation system**. Every application, micro-frontend, or plugin MUST declare exactly what it can do using an **Application Manifest**. Interoperability is achieved by matching the **Requirements** of a study set with the **Capabilities** of the application.

### 2.1. The Application Manifest

Applications MUST declare their capabilities in a standardized JSON format. This allows host environments to automatically determine if an application or plugin can safely process a given study set.

**Delivery:** Applications delivered via HTML SHOULD embed their manifest using a `<script type="application/oqse-manifest+json">` tag. This pattern is known as an **HTML Data Island**: the browser ignores the script block entirely (it does not execute it), but the host environment can locate and parse it cheaply via a DOM query (`document.querySelector('script[type="application/oqse-manifest+json"]')`), without requiring a separate network request. Applications that are not HTML-based (e.g., server-side importers, CLI tools) SHOULD expose their manifest as a static `oqse-manifest.json` file at the root of their deployment, allowing host environments to fetch it without rendering the application. When served over HTTP, this file SHOULD be delivered with the standard `Content-Type: application/json` MIME type; this avoids the need for developers to configure custom MIME types on their static file servers. Host environments MAY also support manifest discovery via an HTTP `Link` response header: `Link: <oqse-manifest.json>; rel="oqse-manifest"`.

**Manifest Structure Example:**

```json
{
  "$schema": "https://memizy.com/schemas/oqse-manifest/v0.1.json",
  "version": "0.1",
  "pluginVersion": "2.1.0",
  "minOqseVersion": "1.0",
  "maxOqseVersion": "1.99",
  "id": "https://memizy.com/universal-player",
  "appName": "Memizy Universal Player",
  "description": "A universal flashcard and quiz player with spaced repetition.",
  "author": "Memizy Team",
  "authorUrl": "https://memizy.com",
  "locales": ["en", "cs"],
  "tags": ["flashcards", "spaced-repetition", "quiz"],
  "emoji": "🧠",
  "studyMode": "fun",
  "questionDensity": "medium",
  "capabilities": {
    "actions": [
      "render",
      "edit"
    ],
    "types": [
      "flashcard",
      "mcq-single",
      "match-pairs"
    ],
    "assets": {
      "image": ["image/jpeg", "image/png", "image/svg+xml", "image/webp"],
      "audio": ["audio/mpeg", "audio/ogg"],
      "video": ["video/mp4"],
      "model": null
    },
    "features": [
      "math",
      "markdown",
      "text-to-speech"
    ],
    "latexPackages": [
      "mhchem",
      "amsmath"
    ],
    "itemProperties": [
      "hints",
      "explanation",
      "sources"
    ],
    "metaProperties": [
      "license",
      "contributors"
    ]
  }
}
```

#### 2.1.1 Manifest Root Object

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `$schema` | string | No | **Recommended.** URL reference to the JSON Schema specification for automatic validation. |
| `version` | string | Yes | Version of the Application Manifest format. MUST follow `"MAJOR.MINOR"` format (e.g., `"1.0"`). The current manifest format version is `"1.0"`. |
| `pluginVersion` | string | No | Version of the application/plugin itself using SemVer (e.g., `"2.1.0"`). Independent of the manifest format version. |
| `minOqseVersion` | string | No | Minimum OQSE spec version this application requires. MUST follow `"MAJOR.MINOR"` format (e.g., `"1.0"`). Version comparison is performed numerically field-by-field. Host environments MAY use this for compatibility filtering. |
| `maxOqseVersion` | string | No | Maximum OQSE spec version this application is compatible with. MUST follow `"MAJOR.MINOR"` format (e.g., `"1.99"`). Version comparison is performed numerically field-by-field. Host environments MAY use this to prevent loading a plugin with a newer, potentially incompatible OQSE version. If absent, no upper bound is assumed. |
| `id` | string | Yes | Unique identifier for the application. MUST be either a controlled URL (preferred — MAY lead to the official page of the plugin, e.g., `"https://memizy.com/player"`) or a URN-format UUID (e.g., `"urn:uuid:019cba2f-7ea1-7607-8f16-be10714d790e"`). |
| `appName` | string | Yes | Human-readable name of the application. |
| `description` | string | No | **Plain Text.** Human-readable description of what the application does. Displayed in host environments and plugin catalogs. |
| `author` | string | No | **Plain Text.** Name of the author or organization. |
| `authorUrl` | string | No | **URI (absolute URL).** URL of the author or organization. |
| `locales` | string[] | No | BCP 47 locale codes for the application's supported UI languages (e.g., `["en", "cs"]`). Host environments MAY use this when choosing a plugin for a specific user locale. If absent or `[]`, the host SHOULD assume the application supports English. |
| `tags` | string[] | No | Array of plain text keywords describing the application's purpose or focus area (e.g., `["flashcards", "spaced-repetition", "chess"]`). Used by host environments and catalogs for filtering and discovery. Uses the same convention as `meta.tags` in study sets. |
| `emoji` | string | No | A single emoji character used as the application's visual identity in catalogs and host UIs where loading a full icon image is impractical (e.g., `"🧠"`, `"🚀"`, `"🎮"`). SHOULD contain a single visually-rendered emoji glyph (note: some emoji such as flags or family sequences are composed of multiple Unicode code points — this is acceptable). If a future `iconUrl` field is also declared in an extension, hosts SHOULD prefer that over `emoji`. |
| `studyMode` | string | No | Enum indicating the application's primary experience type. MUST be one of: `"game"` (entertainment-first; gameplay mechanics take priority over traditional study), `"fun"` (balanced blend of interactivity and learning), `"drill"` (maximally focused, distraction-free repetition). Helps host environments and users choose an appropriate plugin for their goals. If absent, no assumption is made. See `questionDensity` for a complementary signal about quiz frequency within the experience. |
| `questionDensity` | string | No | Enum describing the ratio of quiz items relative to non-question game elements. MUST be one of: `"low"` (questions appear rarely, gameplay dominates), `"medium"` (questions and gameplay are roughly balanced), `"high"` (nearly every interaction is a question). Primarily meaningful for plugins with `studyMode: "game"` or `"fun"`. If the plugin declares `studyMode: "drill"`, host environments SHOULD treat `questionDensity` as `"high"` regardless of the declared value. If absent, no assumption is made. See `studyMode` for the primary classification. |
| `appSpecific` | object | No | Object for application-specific metadata not covered by the standard fields. Top-level keys in this object MUST be namespaced by the application identifier (e.g., `"memizy"`) to prevent collisions between applications (e.g., `{ "memizy": { "editorState": {...} } }`). Applications declaring custom `x-` features SHOULD document their semantics here so that host environments can surface that information. Other applications MUST ignore this object. |
| `capabilities` | object | Yes | Object defining application's capabilities. Extends **FeatureProfile** (adds `types` and `assets`). |

#### 2.1.2 Capabilities Object (extends FeatureProfile)

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `actions` | string[] | Yes | Array of actions the application can perform on supported types (e.g., `["render", "edit"]`). MUST contain at least one action from the [Action Registry](#213-action-registry). Custom actions MAY be declared using the `x-` prefix (e.g., `"x-preview"`). |
| `types` | string[] | Conditional | Array of OQSE item types the application supports (e.g., `["flashcard", "mcq-single"]`). Use `["*"]` to declare support for all item types. **Required** (at least one type or `["*"]`) when `actions` includes `render` or `edit`; MAY be omitted for `validate`, `import`, or `export`-only applications (though declaring `["*"]` is recommended). An empty array `[]` MUST be treated as `null` (no types declared); such a manifest would fail the `render`/`edit` rule above. See [Wildcard and Null Semantics](#wildcard-and-null-semantics). |
| `assets` | object | No | Map of asset categories (`image`, `audio`, `video`, `model`) to arrays of supported MIME types. If `assets` is omitted entirely, the application declares no media support (equivalent to all categories being `null`). See [Wildcard and Null Semantics](#wildcard-and-null-semantics). |
| `features` | string[] | No | **(Inherited)** Array of supported features from the **Official Feature Registry** and/or custom `x-` prefixed extensions. See [Extension Rules](#extension-rules). |
| `latexPackages` | string[] | No | **(Inherited)** Array of supported LaTeX packages. |
| `itemProperties` | string[] | No | **(Inherited)** Array of supported item properties. |
| `metaProperties` | string[] | No | **(Inherited)** Array of supported metadata properties. |

#### Wildcard and Null Semantics

The `types` array and each value in the `assets` map follow a unified convention:

| Value | Meaning |
| :--- | :--- |
| `["*"]` | **All accepted.** Supports all item types (for `types`) or any MIME type within that asset category (for `assets`). Useful for validators, export tools, or applications designed to handle any content. |
| `["image/jpeg", ...]` | **Explicit list.** Only the enumerated values are supported. |
| `null` or key absent | **Not supported.** The application does not support this category at all. Hosts MUST NOT pass such content to the application. |
| `[]` | **Equivalent to `null`.** An empty array carries the same meaning as `null` or key omission — nothing is supported in that category. Applications SHOULD NOT emit an empty array (prefer `null` or key omission for clarity), but parsers MUST treat it identically to `null`. |

#### 2.1.3 Action Registry

The `actions` array in the `capabilities` object defines the functional roles an application performs on supported item `types`. The interpretation of `itemProperties` is directly tied to these declared actions.

| Action | Description |
| :--- | :--- |
| **`render`** | **Learning/Player Mode:** The application can display the item in a fully interactive study mode. It MUST handle user input, feedback cycles, and all other behaviors declared as supported in `itemProperties` and `metaProperties`. |
| **`edit`** | **Authoring Mode:** The application provides a user interface for creating or modifying item content. An editor SHOULD provide a faithful visual preview of the data (rendering Markdown and media) so the author sees the final result, but it is not required to implement interactive scoring or study logic. |
| **`validate`** | **Verification Mode:** The application checks the structural, technical, and logical correctness of the item without necessarily providing a user interface (e.g., CI/CD linters). |
| **`import`** | **Data Ingestion:** The application can parse OQSE data and transform it into an internal system or database. |
| **`export`** | **Data Generation:** The application can serialize internal data into a valid OQSE format (including normalization of lowercase asset filenames). |

**Custom actions:** Applications MAY define proprietary action roles using the `x-` prefix (e.g., `"x-preview"`, `"x-sync"`). Custom actions follow the same `x-` prefix convention as custom features (see [Extension Rules](#extension-rules)). Host environments that do not recognize a custom action MUST NOT fail manifest loading solely for that reason; they SHOULD ignore the unknown action.

**Note on UI Expectations:**
An application declaring the `edit` action MUST NOT be a mere raw JSON text editor; to comply with the standard's intent, it SHOULD offer the author visual context. If an application declares only `edit` (without `render`), it serves as a content creation tool while leaving the actual study process (answering and evaluation) to applications with `render` declared.

**Contextual Property Application:**
Properties defined in `itemProperties` and `metaProperties` are interpreted context-aware based on the active action, for example:
* **`hints`**: In `render` mode, these are displayed as interactive prompts; in `edit` mode, they appear as input fields for the author.
* **`topic`**: In `render` mode, this is used for filtering or as a chapter heading; in `edit` mode, it is used to categorize the item within the set structure and can be changed.
* **`explanation`**: In `render` mode, it is revealed after the user answers; in `edit` mode, it can be changed within a Rich Content editor.

### 2.2. Feature Profile & Official Registry

To avoid redundancy, OQSE defines a base object called **FeatureProfile**. This structure is used in both the Application Manifest (in `capabilities`) and the Study Set (in `meta.requirements`).

#### FeatureProfile Structure

| Key | Type | Description |
| :--- | :--- | :--- |
| `features` | string[] | Array of feature flags. MUST contain only values from the **Official Feature Registry** or custom `x-` prefixed values (e.g., `"x-my-feature"`). See [Extension Rules](#extension-rules). |
| `latexPackages` | string[] | Array of LaTeX packages (e.g., `["mhchem"]`). Relevant only if `features` includes `"math"`. |
| `itemProperties` | string[] | Array of item properties supported/required. [See **Registry of Properties**](#registry-of-properties-itemproperties--metaproperties). |
| `metaProperties` | string[] | Array of metadata properties supported/required. [See **Registry of Properties**](#registry-of-properties-itemproperties--metaproperties). |

#### Official Feature Registry

The `features` array MUST contain only values from this registry:

| Feature Key | Category | Description |
| :--- | :--- | :--- |
| `markdown` | Formatting | Application MUST support parsing **GitHub Flavored Markdown (GFM)** syntax in Rich Content fields. This ensures support for basic formatting, tables, strikethrough, and fenced code blocks (` ``` `). GFM natively parses fenced blocks into unstyled `<pre><code>` structures. For colored keywords, the `syntax-highlighting` feature MUST also be declared. This flag requires support for Markdown syntax only. If the set relies on raw HTML embedded within the Markdown, `html-safe` MUST also be declared. |
| `html-safe` | Formatting | Application allows and safely renders intentional raw HTML tags (e.g., `<span style="color:red">`, `<ruby>`) embedded in text fields. Applications MUST perform strict sanitization [See section 12.4.](#124-security). |
| `math` | Formatting | Application MUST detect `$` and `$$` delimiters in text and render them as LaTeX mathematical formulas. |
| `ruby-annotations` | Typography | Application MUST render standard HTML5 `<ruby>`, `<rt>`, and `<rp>` tags for phonetic guides (Furigana/Pinyin). Implicitly requires handling these tags even if `html-safe` is off. Application SHOULD style `<rt>` with smaller font size above base text. |
| `rtl` | Typography | Application MUST support Right-to-Left text direction and alignment for languages like Arabic or Hebrew. |
| `syntax-highlighting`| Blocks | Application applies syntax coloring (highlighting) to the structural code blocks generated by the GFM parser (e.g., coloring Java keywords in ` ```java `). **Requires `markdown`:** only meaningful when the GFM parser is active. Applications SHOULD NOT declare this feature without also declaring `markdown`. |
| `mermaid` | Blocks | Application can render Mermaid diagrams from code blocks (via ` ```mermaid `). **Requires `markdown`:** only meaningful when the GFM parser is active. Applications SHOULD NOT declare this feature without also declaring `markdown`. |
| `smiles` | Blocks | Application can render 2D chemical structures from SMILES strings in code blocks (via ` ```smiles `). **Requires `markdown`:** only meaningful when the GFM parser is active. Applications SHOULD NOT declare this feature without also declaring `markdown`. |
| `abc-notation` | Blocks | Application can render music notation from ABC syntax in code blocks (via ` ```abc `). **Requires `markdown`:** only meaningful when the GFM parser is active. Applications SHOULD NOT declare this feature without also declaring `markdown`. |
| `text-to-speech` | Interaction | Application supports reading text aloud (e.g., interpreting hidden pronunciation hints). |
| `voice-input` | Interaction | Application allows input via voice dictation. |
| `handwriting-recognition` | Interaction | Application allows input via handwriting (useful for math/languages on tablets). |

#### Registry of Properties (itemProperties & metaProperties)

Values in `itemProperties` and `metaProperties` indicate support for specific fields or complex behaviors.

**itemProperties (Item Level Support):**

| Property Key | Description |
| :--- | :--- |
| `hints` | Application displays optional hints to the user. |
| `explanation` | Application displays explanation after answering. |
| `incorrectFeedback` | Application displays specific feedback for incorrect answers. |
| `sources` | Application can display references to source materials for each item. |
| `relatedItems` | Application can navigate to or display explicitly related items. |
| `dependencyItems` | Application respects logical dependencies between items (prerequisites), declared via the `dependencyItems` field. |
| `timeLimit` | Application enforces or visibly displays time limits for items. |
| `lang` | Application respects per-item language overrides (e.g., for TTS or font rendering). |
| `topic` | Application supports grouping, filtering, or displaying items by their primary `topic`. |
| `pedagogy` | Application utilizes advanced pedagogical data (IRT, forgetting curves). |

**metaProperties (Set Level Support):**

| Property Key | Description |
| :--- | :--- |
| `description` | Application displays the set description to the user (e.g., on a detail or preview screen). |
| `thumbnail` | Application displays the set cover image as a visual identifier in lists or cards. |
| `subject` | Application uses the `subject` field for categorization, browsing, or search filtering. |
| `language` | Application respects the declared set language (e.g., for TTS engine selection, font rendering, or UI locale hints). |
| `author` | Application attributes the primary author of the set (e.g., in a detail view or export header). |
| `contributors` | Application attributes all listed contributors of the set. |
| `license` | Application displays licensing information and respects usage rights. |
| `ageRestriction` | Application respects `ageMin` and `ageMax` recommendations (e.g., hides or warns for age-inappropriate content). |
| `tags` | Application supports browsing, filtering, or searching by set-level tags. |
| `tagDefinitions` | Application uses tag definitions to display semantic descriptions or Wikidata-linked tooltips. |
| `sourceMaterials` | Application displays the range of sources used in the set. |
| `estimatedTime` | Application displays or uses the estimated completion time (e.g., progress indicators, scheduling). |
| `prerequisites` | Application respects prerequisite sets and warns or prevents access if they have not been completed. |
| `translations` | Application can suggest or navigate to translated versions of the set. |
| `relatedSets` | Application can suggest related study sets (e.g., in a "Study next" recommendation). |

> **Note on Declaration Semantics:** The `itemProperties` and `metaProperties` arrays do **not** enumerate all fields that a set *happens to contain*. They are an **intentional signal** from the set creator that specific behaviors are meaningful and expected. For example: a set creator who wants attribution explicitly displayed declares `"author"` in `metaProperties`; a set targeting children where age enforcement is important declares `"ageRestriction"`. An application that does not support a declared property MUST still preserve the data when saving, but is not required to actively implement it.

#### Parsing Rules for Blocks
For features `syntax-highlighting`, `mermaid`, `smiles`, and `abc-notation`, content MUST be written using standard Markdown Fenced Code Blocks with appropriate language identifiers (e.g., ` ```java `, ` ```mermaid `, ` ```smiles `, ` ```abc `). Applications that do not support a specific feature MUST gracefully degrade by rendering the content as a plain text code block.

#### Extension Rules

To prevent fragmentation, the following rules apply to the `features` array:
1.  **Official values only** (without prefix): Developers MUST NOT invent new unprefixed string values. Only values from the **Official Feature Registry** above are valid without a prefix.
2.  **Custom features with `x-` prefix:** Developers MAY define proprietary feature flags using the `x-` prefix (e.g., `x-memizy-3d-voxel`, `x-spaced-repetition`). These values MUST NOT collide with future official registry entries and SHOULD be documented in the Application Manifest's own `appSpecific` field.
3.  **Proprietary Behavior (no feature contract):** Application-specific configurations or internal UI behaviors that do not need to be negotiated via the handshake MUST be placed inside the `appSpecific` object instead.
4.  **New Data Structures:** If a completely new data structure is needed, a new `item.type` MUST be defined (following the same `x-` prefix convention per [section 11.1](#111-adding-custom-item-types)).

### 2.3. The Handshake (Matching Process)

Before an application attempts to process a set, it MUST perform a compatibility check:

1.  **Item Type Check:** If the set contains an item of type `X`, the application MUST have `X` in its `types` array, or declare `["*"]` as `types`. This check applies equally to `x-` prefixed custom types.
2.  **Asset Check:** For each asset used in the set, the application MUST either list its MIME type explicitly in the corresponding `capabilities.assets` category (e.g., `"image/webp"` in `capabilities.assets.image`) or declare `["*"]` for that asset category. If `capabilities.assets` is absent, or the relevant category key is `null` or `[]`, that asset category is not supported.
3.  **OQSE Version Check:** If the application declares `minOqseVersion`, the host MUST verify that the OQSE file's `version` is greater than or equal to it. If `maxOqseVersion` is declared, the host MUST verify that the file's `version` does not exceed it. A host MUST NOT load the set into the application if the version check fails; it MUST inform the user of the incompatibility.
4.  **Feature Profile Check:** If `meta.requirements` is present, the application MUST compare it with `capabilities`:
    *   **Features:** Application MUST support all features listed in `meta.requirements.features`.
    *   **LaTeX Packages:** Application MUST support all packages listed in `meta.requirements.latexPackages`.
    *   **Properties:** Application SHOULD support all properties listed in `meta.requirements.itemProperties` and `meta.requirements.metaProperties`.

### 2.4. Graceful Degradation

If an application lacks a required capability:
*   **Missing `types`:** The application MUST NOT crash. It MUST either ignore the unsupported items (allowing a partial study session), display a generic fallback message, or allow their raw editing as JSON to prevent data loss.
*   **Missing `features` or `latexPackages`:** The application SHOULD warn the user.
*   **Missing `itemProperties` or `metaProperties`:** The application MAY ignore these fields but MUST preserve them if editing/saving the set.
*   **Missing `assets` capability:** The application declares no support for one or more asset categories (either `capabilities.assets` is absent, or the specific category is `null` or `[]`). The application SHOULD display a placeholder for the unsupported media and MUST NOT crash when encountering asset references for those categories.
*   **Missing `x-` prefixed feature:** Treated identically to a missing official feature — the application SHOULD warn the user. Unlike official features, the application MAY additionally display a message identifying the specific proprietary extension that is not supported.
*   **OQSE Version Mismatch:** If the set's `version` falls outside the application's declared `minOqseVersion`–`maxOqseVersion` range, the host MUST NOT load the set into the application. The host MUST display a clear error message indicating the version incompatibility and SHOULD suggest an alternative compatible application if one is available in the catalog.

-----

### 2.5. User Progress Portability (OQSEP)

Applications that implement spaced repetition or other adaptive learning algorithms accumulate significant per-user, per-item learning data over time. Without a standard for this data, users are entirely dependent on a single platform — a form of **vendor lock-in** that makes migrating to a better tool, or continuing study on a different device, practically impossible.

**OQSEP** (Open Quiz & Study Exchange — Progress) is a lightweight, companion JSON format that standardizes the representation and export of this learning progress. An OQSEP file is always associated with a specific OQSE study set (identified by `meta.setId`) and contains one progress record per item in that set.

#### Rationale & Design Goals

*   **Portability over precision.** Progress data MUST be exportable and importable across applications using different spaced repetition algorithms (e.g., Leitner, SM-2, FSRS). No single algorithm's internal state is mandated.
*   **Raw statistics as a universal bridge.** Complex algorithms such as FSRS require parameters (stability, difficulty, retrievability) that are meaningless outside their own mathematical model. OQSEP solves this by always storing the **raw outcome statistics** (`attempts`, `incorrect`, `streak`) which any algorithm can use as a **Cold Start** seed when importing progress from a foreign system.
*   **Lightweight by design.** Simple applications and plugins MAY rely solely on `bucket` and `nextReviewAt` without ever parsing `appSpecific` data. This allows a plugin with a minimal implementation to still consume OQSEP files meaningfully.
*   **No answer content stored.** OQSEP deliberately does not record the actual text of a user's answers. Only the outcome (`isCorrect`) and optional confidence (`confidence`) are stored. This keeps the progress file lean and avoids reproducing the set content redundantly.

#### Distribution Format

OQSEP files MUST be valid UTF-8 encoded JSON. The RECOMMENDED file extension is `.oqsep.json` (plain `.json` is also fully permitted; the compound extension improves discoverability in editors and file managers without requiring special tooling). The RECOMMENDED MIME type for HTTP transmission is `application/json` (custom APIs MAY use `application/vnd.oqsep+json` for strict content negotiation). An OQSEP file MUST NOT be embedded inside an OQSE container (`.oqse` / `.json`); it is always a separate, standalone artifact.

#### 2.5.1 Data Model

An OQSEP document is a single JSON object with the following structure.

##### Root Object

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `$schema` | string | No | **Recommended.** URL reference to the JSON Schema for the OQSEP format for automatic validation. |
| `version` | string | Yes | Version of the OQSEP format. MUST follow `"MAJOR.MINOR"` format (e.g., `"1.0"`). The current format version is `"0.1"`. |
| `meta` | object | Yes | Metadata block describing the origin of this progress data. See [Progress Meta Object](#progress-meta-object). |
| `records` | object | Yes | A map of item UUIDs (strings) to their individual [Progress Record](#progress-record) objects. The absence of an item from this map implicitly signals an unseen state (equivalent to bucket 0). An explicit record with `bucket: 0` MAY, however, appear when an application stores pre-study initialization data or algorithm-specific state for an item the user has not yet encountered. |

##### Progress Meta Object

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `setId` | string | Yes | **Plain Text.** The UUID of the OQSE study set this progress file corresponds to. Importing applications MUST verify this matches the set being loaded before applying the progress data. |
| `exportedAt` | string | Yes | ISO 8601 timestamp (e.g., `"2026-03-04T12:00:00Z"`) indicating when this progress file was generated. |
| `algorithm` | string | No | Identifier of the spaced repetition algorithm last used to update these records. The value MUST be lowercase and alphanumeric, with hyphens permitted (pattern: `^[a-z0-9\-]+$`). When using a widely recognized algorithm, applications MUST use one of the following official identifiers: `"leitner"`, `"sm2"`, `"sm15"`, `"fsrs"`, `"anki"`. This field is informational only; importing applications MUST NOT refuse to import a file solely because this value differs from their own algorithm. |

##### Progress Record

Each entry in the `records` map is keyed by an item UUID and contains the following object. The absence of an item in the `records` map implicitly means it is unseen and has no stored state. However, an explicit record MAY exist even for unseen items if an application needs to store pre-study initialization data or specific `appSpecific` state.

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bucket` | integer | Yes | Current knowledge level of the item. MUST be an integer in the range **0–4**. See [Bucket Scale](#bucket-scale). Value `0` explicitly denotes an item that is in a *new*, *unseen*, or *reset* state; if `bucket` is `0`, the value of `stats.attempts` SHOULD logically be `0`. Values **1–4** represent increasing levels of knowledge. |
| `nextReviewAt` | string | No | ISO 8601 timestamp indicating when the item is next due for review. Applications utilizing only a simple scheduler MAY rely solely on this field and `bucket`, ignoring `appSpecific`. |
| `stats` | object | Yes | Aggregate outcome statistics across all past attempts. See [Stats Object](#stats-object). |
| `lastAnswer` | object | No | Details of the most recent single answer session. See [Last Answer Object](#last-answer-object). |
| `appSpecific` | object | No | A namespaced object for storing algorithm-specific internal state that cannot be expressed through the standard fields. Top-level keys MUST be the application identifier (e.g., `"memizy"`), with algorithm-specific data nested beneath (e.g., `{ "memizy": { "fsrs": { "stability": 0.42 } } }`). This namespacing prevents key collisions when multiple applications round-trip the same file. Applications MUST preserve all keys in this object when saving, modifying only their own namespace. |

##### Stats Object

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `attempts` | integer | Yes | Total number of times this item has ever been answered. MUST be ≥ 0. |
| `incorrect` | integer | Yes | Total count of incorrect answers (lapses) across all attempts. MUST be ≥ 0 and ≤ `attempts`. |
| `streak` | integer | Yes | Current consecutive correct answers streak. Reset to `0` on any incorrect answer. MUST be ≥ 0. |

##### Last Answer Object

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `isCorrect` | boolean | Yes | Whether the most recent answer was correct. If `isSkipped` is `true`, this field SHOULD be `false` and MUST be ignored by scheduling logic. |
| `confidence` | integer | No | User's self-assessed confidence rating after the most recent answer. MUST be an integer in the range **1–4** if present. See [Confidence Scale](#confidence-scale). |
| `answeredAt` | string | Yes | ISO 8601 timestamp of when the answer was submitted. |
| `timeSpent` | integer | No | Time spent on this specific answer attempt, in milliseconds. MUST be ≥ 0 if present. |
| `hintsUsed` | integer | No | Number of hints the user revealed during this attempt. MUST be ≥ 0 if present. Defaults to `0` when absent. |
| `isSkipped` | boolean | No | Whether the user skipped the item without submitting an answer. When `true`, `isCorrect` SHOULD be `false` and MUST be ignored by scheduling logic. |

#### 2.5.2 Bucket Scale

The `bucket` field encodes the current knowledge level of an item on a **0–4 integer scale**, directly inspired by the Leitner box system. It provides a universal, algorithm-agnostic signal that all importing applications can map to their own scheduling tiers.

The absence of an item from the `records` map is the canonical representation of an unseen item. Value `0` acts as an explicit, storable equivalent of that unseen state, provided to allow applications to attach pre-study initialization data (e.g., seeding `appSpecific` parameters before a first session) without implying the user has already encountered the item.

| Bucket | Label | Meaning |
| :---: | :--- | :--- |
| **0** | *New / Reset* | Item is in an initial or reset state. The user has not meaningfully engaged with it. MAY be stored explicitly when pre-initialization data is needed; otherwise the item is simply absent from `records`. `stats.attempts` SHOULD be `0` when this value is stored. |
| **1** | *Learning* | Item is newly introduced or was recently answered incorrectly. Requires frequent, short-interval review. |
| **2** | *Familiar* | Item has been answered correctly at least once but is not yet reliably recalled. Review intervals are moderate. |
| **3** | *Consolidated* | Item is recalled reliably under normal conditions. Review intervals are longer. |
| **4** | *Mastered* | Item is recalled effortlessly and consistently. Review intervals are long-term. |

#### 2.5.3 Confidence Scale

The `confidence` field, when present, captures the user's **subjective assessment of their own recall quality** immediately after answering. It uses a **forced four-point scale (1–4)** with no middle value.

The deliberate absence of a middle option prevents the central-tendency bias common in three-point or odd-numbered scales without a forced choice — users statistically gravitate towards a neutral midpoint when one is available, producing data that is too uniform to be useful for adaptive scheduling. A four-point scale forces a genuine lean toward either weak or strong recall.

| Rating | Label | Meaning |
| :---: | :--- | :--- |
| **1** | *Complete Blackout* | No recall whatsoever. The answer was wrong and even seeing the correct answer did not trigger recognition. |
| **2** | *Familiar but Forgotten* | The answer was incorrect, but upon seeing the correct answer it felt familiar or obvious in hindsight. Some trace memory exists. |
| **3** | *Correct with Effort* | The answer was correct, but required noticeable hesitation, conscious effort, or felt uncertain throughout. |
| **4** | *Effortless Recall* | The answer was correct and came immediately, without hesitation or doubt. |

#### 2.5.4 Example

A minimal but complete OQSEP document with two item records:

```json
{
  "$schema": "https://memizy.com/schemas/oqsep/v0.1.json",
  "version": "0.1",
  "meta": {
    "setId": "019cb880-acf3-7bb1-a717-96bb05e220c1",
    "exportedAt": "2026-03-04T14:30:00Z",
    "algorithm": "leitner"
  },
  "records": {
    "019cb880-d607-7944-8630-66b9b432109a": {
      "bucket": 3,
      "nextReviewAt": "2026-03-11T09:00:00Z",
      "stats": {
        "attempts": 8,
        "incorrect": 1,
        "streak": 5
      },
      "lastAnswer": {
        "isCorrect": true,
        "confidence": 4,
        "answeredAt": "2026-03-04T14:28:11Z"
      }
    },
    "019cb880-ee7f-7e91-83ed-44bec565b69d": {
      "bucket": 1,
      "nextReviewAt": "2026-03-05T09:00:00Z",
      "stats": {
        "attempts": 3,
        "incorrect": 2,
        "streak": 0
      },
      "lastAnswer": {
        "isCorrect": false,
        "confidence": 1,
        "answeredAt": "2026-03-04T14:29:05Z"
      },
      "appSpecific": {
        "memizy": {
          "fsrs": {
            "stability": 0.42,
            "difficulty": 7.81,
            "retrievability": 0.61
          }
        }
      }
    }
  }
}
```

Note that an item belonging to the set might be entirely absent from `records`. The absence of a record implicitly means the user has never been shown that item (and it defaults to bucket 0 behavior). However, explicit records with `bucket: 0` are also perfectly valid for unseen items.

#### 2.5.5 Portability Best Practices

**On omitting answer content:** OQSEP deliberately does not store the literal text or selection of the user's answers (e.g., the exact string they typed). The `lastAnswer` object records only whether the answer was correct (`isCorrect`) and an optional confidence rating. This is a conscious design choice to keep the progress file lean. Spaced repetition algorithms require outcome signals (correctness, confidence, timing), not a replay of what was typed. If an application strictly requires saving the exact user input for custom features, it MUST place this data inside its `appSpecific` namespace.

**On `appSpecific` usage:** Algorithm-specific parameters that are opaque outside a given algorithm's mathematical model — such as FSRS stability (S) and difficulty (D) values — MUST be stored exclusively inside the `appSpecific` sub-object of the relevant record. Top-level keys within `appSpecific` MUST be the application identifier (e.g., `"memizy"`), with algorithm-specific data nested beneath (e.g., `{ "memizy": { "fsrs": { ... } } }`). This namespacing is mandatory to prevent silent key collisions when a file passes through multiple applications. Applications MUST preserve all keys in `appSpecific` when saving, modifying only their own namespace. Storing proprietary data at the top level of a Progress Record — or directly as an un-namespaced key in `appSpecific` — is not permitted and WILL cause validation failures.

**On cold-start import:** When an application using a complex algorithm (e.g., FSRS) receives a progress file produced by a simpler one (e.g., Leitner), the `appSpecific` block for its own algorithm will be absent. The application SHOULD gracefully initialize its internal parameters using the universally available `stats` (`attempts`, `incorrect`, `streak`) and `bucket` as seed data. This is the **Cold Start** scenario: deriving reasonable initial parameter estimates from raw statistics rather than refusing the import.

**On `setId` verification:** Importing applications MUST compare `meta.setId` against the UUID of the OQSE set being opened. If the values do not match, the application SHOULD warn the user and refrain from applying the progress data automatically to prevent data corruption.

**On partial records and unseen items:** The `records` map need not contain an entry for every item in the set. Items absent from the map are treated as unseen. However, applications MAY explicitly generate a record with `bucket: 0` for an item that has never been presented if they need to store pre-study initialization data, suspended states, or `appSpecific` metadata. While permitted, applications SHOULD NOT unnecessarily synthesize placeholder records for all unseen items just to fill the file, as this bloats the file size.

-----

## 3. The `meta` Object

Contains all information describing the entire set.

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | Unique UUID of the set. |
| `language` | string | Yes | Language code of the set according to BCP 47 (e.g., `cs`, `en-US`, `zh-Hans`). Application SHOULD be tolerant when reading formatting (e.g., accept and normalize `cs_CZ` and `cs-CZ`). |
| `title` | string | Yes | **Plain Text.** Title of the study set. |
| `description` | string | No | **Rich Content.** Short description of the set. |
| `thumbnail` | string | No | **Plain Text.** Key from `meta.assets` that defines the cover image of the set. If the specified key does not exist in `meta.assets`, the Application MUST continue loading the set (without a cover image). |
| `assets` | object | No | Dictionary (map) of media for the entire set. Used for: 1) set metadata (e.g., cover image), 2) **shared media** used in multiple items (e.g., a map that appears in 20 questions). The key is a local identifier, the value is a `MediaObject` object. Application when replacing `<asset:key />` uses fallback: first `item.assets`, then `meta.assets`. |
| `ageMin` | number | No | Minimum recommended age (0 = preschool, but recommended >= 3). |
| `ageMax` | number | No | Maximum recommended age. |
| `subject` | string | No | **Plain Text.** Subject/field in the set's language (e.g., `mathematics`, `biology`, `history`). |
| `createdAt` | string | Yes | Date and time of creation in ISO 8601 format (UTC recommended). |
| `updatedAt` | string | Yes | Date and time of last modification in ISO 8601 format. (UTC recommended)|
| `author` | PersonObject | No | Information about the main author of the set. [See section 3.4](#34-the-personobject-object-in-metaauthor-and-metacontributors). |
| `contributors` | PersonObject[] | No | Array of information about other contributors. |
| `license` | string | No | [SPDX license](https://spdx.org/licenses/) identifier (e.g., `CC-BY-SA-4.0`, `CC0-1.0`). Determines usage rights for the set. |
| `licenseUrl` | string | No | **URI (absolute URL).** Link to the full text of the license. |
| `requirements` | object | No | A **FeatureProfile** object describing set's explicit requirements (e.g., `features`, `latexPackages`). **Note:** Required item types and assets are implicit to the content and MUST NOT be listed here. |
| `tags` | string[] | No | **Plain Text.** Array of text labels (tags) for the entire set. |
| `tagDefinitions` | object | No | Dictionary (map), where the key is a string (tag) and the value is a TagDefinition object. [See section 3.3](#33-the-tagdefinition-object-as-value-in-tagdefinitions). Used for tag meanings in `meta.tags` and `item.tags`. |
| `translations` | TranslationObject[] | No | Array of references to translations of this set in other languages. [See **section 7.5**](#75-translationobject-for-metatranslations). |
| `sourceMaterials` | SourceMaterial[] | No | Array of objects describing sources from which the set draws. |
| `estimatedTime` | number | No | Estimated time to complete the set in minutes. |
| `prerequisites` | LinkedSetObject[] | No | Array of references to sets that should be completed before this set. [See section 7.6](#76-linkedsetobject-for-metaprerequisites-and-metarelatedsets). |
| `relatedSets` | LinkedSetObject[] | No | Array of references to related OQSE sets (for recommendations). [See section 7.6](#76-linkedsetobject-for-metaprerequisites-and-metarelatedsets). |
| `customData` | object | No | Object for metadata determined by the author/creator (e.g., internal notes, course ID at school). Not intended for application logic. |
| `appSpecific` | object | No | Object for metadata specific to a particular software application (e.g., editor configuration, display state, last position). Top-level keys MUST be namespaced by the application identifier to prevent collisions (e.g., `{ "memizy": { "lastPosition": 42 } }`). Other applications MUST ignore this object. |

### 3.1. The `SourceMaterial` Object (in `sourceMaterials`)

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | **Plain Text.** Unique ID (within the file) for this source (e.g., `src-1`, `book-physics`). Not a global identifier. |
| `type` | string | Yes | Source type from selection (`url`, `doi`, `isbn`, `pdf`, `textbook`, `video`, `audio`, `image`, `model`, `other`). |
| `value` | string | Yes | **Plain Text** (for identifiers: `doi`, `isbn`, `textbook`, `other`) or **URI (absolute URL)** (for types: `url`, `pdf`, `video`, `audio`, `image`, `model`). MUST match the type specified in `type`. |
| `title` | string | Yes | **Plain Text.** Source title (e.g., "Wikipedia: Raptor", "Physics for High Schools"). |
| `description` | string | No | **Plain Text.** Additional source description (e.g., "Chapter 5, pp. 42-50", "Official SpaceX website"). |
| `authors` | string[] | No | **Plain Text.** Source authors. |
| `publishedDate` | string | No | Source publication date (ISO 8601 - UTC recommended). |
| `retrievedAt` | string | No | Date (ISO 8601 - UTC recommended) when the source was used (important for online sources). |
| `license` | string | No | License of the original source (SPDX ID). |

### 3.2. Description of Source Material Types (`type` in `SourceMaterial`)

The following table defines what content we expect in the `value` field for individual types:

| Type (`type`) | Expected content in `value` | Example `value` |
| :--- | :--- | :--- |
| `url` | Full URI address of the source. | `https://en.wikipedia.org/wiki/Raptor...` |
| `doi` | **Digital Object Identifier** – permanent identifier for scientific articles. | `10.1038/s41586-021-04106-z` |
| `isbn` | **International Standard Book Number** – unique book number. | `978-80-7357-124-7` |
| `pdf` | Direct URI address to PDF file. | `https://example.com/study.pdf` |
| `textbook` | Book title (if ISBN is not available or unknown, e.g., old scripts). | `Physics for High Schools (8th edition)` |
| `video` | URI address to video (e.g., YouTube, Vimeo). | `https://www.youtube.com/watch?v=...` |
| `audio` | URI address to audio file/stream (podcast, lecture recording). | `https://example.com/podcast/ep1.mp3` |
| `image` | URI address to image (infographic, map, artwork). | `https://example.com/map.png` |
| `model` | URI address to 3D model file (glTF/GLB). | `https://example.com/anatomy.glb` |
| `other` | Descriptive string for any other source type. | `Internal company document no. 123` |

### 3.3. The `TagDefinition` Object (as value in `tagDefinitions`)

The key in `tagDefinitions` is a human-readable tag (string, Plain Text).

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `wikidataId` | string | No | "Q" identifier from Wikidata for semantic linking. |
| `description` | string | No | **Plain Text.** More detailed tag description. |

### 3.4. The `PersonObject` Object (in `meta.author` and `meta.contributors`)

Complex type for identifying persons involved in the set.

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | Yes | **Plain Text.** Full name of the person (First and Last Name). |
| `role` | string | No | **Plain Text.** Role in the project (e.g., "Editor", "Translator", "Biology Expert"). |
| `email` | string | No | **Plain Text.** Contact email. |
| `url` | string | No | **URI (absolute URL).** Link to website or author profile. |

-----

## 4. Common Item Properties in `items`

Each object in the `items` array is one study item. All items share these basic keys:

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | Unique UUID of the item. |
| `type` | string | Yes | Defines the item type and its other properties. [See section 6](#6-item-types-itemtype). |
| `assets` | object | No | Dictionary (map) of media, where the key is a local identifier (e.g., `"img1"`) and the value is a `MediaObject` object. [See section 5](#5-the-mediaobject-object). |
| `lang` | string | No | **Plain Text.** Language code (BCP 47) for *this specific* item. Overrides `meta.language`. |
| `tags` | string[] | No | **Plain Text.** Array of text labels (tags) for this item. |
| `topic` | string | No | **Plain Text.** A primary category, chapter, or lecture name to which the item belongs (e.g., "Lecture 1: Introduction"). Useful for grouping items in the UI independently of multiple `tags`. |
| `difficulty` | number | No | Numeric difficulty from range 1 (easy) to 5 (hard). Used for simple categorization in UI. For advanced psychometric models, use `pedagogy.irtDifficulty`. |
| `timeLimit` | number | No | Recommended time limit in seconds for answering this item. |
| `hints` | string[] | No | **Rich Content.** Array of hints from first to last. |
| `explanation` | string | No | **Rich Content.** Explanation of the correct answer. |
| `incorrectFeedback` | string | No | **Rich Content.** Message displayed to the user after an incorrect answer before it is appropriate to reveal the full `explanation`. Serves for gentle guidance or pointing out the error without revealing the solution. |
| `sources` | SourceReference[] | No | Array of references to sources (`sourceMaterials`) related to this item. [See section 7.7](#77-sourcereference-for-itemsources). |
| `relatedItems` | string[] | No | Array of IDs of related items in this set. All IDs MUST exist in the `items` array. Item MUST NOT reference its own `id`. Application MUST ignore non-existent references with a warning. |
| `dependencyItems` | string[] | No | Array of `id`s of items that should logically precede this item (prerequisites). All IDs MUST exist in the `items` array. Item MUST NOT reference its own `id`. Circular dependencies are allowed – if the Application supports dependencies, it MUST detect them; Applications that do not support dependencies MAY ignore this field. Application MUST ignore non-existent references with a warning. |
| `pedagogy` | Pedagogy | No | Object containing advanced data for adaptive learning and psychometrics. [See section 7.8](#78-the-pedagogy-object-adaptive-difficulty). |
| `customData` | object | No | Field for static creator metadata. |
| `appSpecific` | object | No | Field for application-specific static metadata. Top-level keys MUST be namespaced by the application identifier to prevent collisions (e.g., `{ "memizy": { "displayHint": "compact" } }`). Other applications MUST ignore this object. |

-----

## 5. The `MediaObject` Object

Standardized object for embedding media. Used:
- As a value in `meta.assets` (dictionary of media at set level, e.g., cover image).
- As a value in `item.assets` (dictionary of media at item level).

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | Yes | Media type from selection (`image`, `audio`, `video`, `model`). The specific allowed file formats are negotiated via the Application Manifest (`capabilities.assets`). For the `model` type, the glTF format (`model/gltf-binary` for `.glb` or `model/gltf+json` for `.gltf`) is highly RECOMMENDED as the universal baseline for interoperability. However, applications and sets MAY use other formats (like `.obj` or `.fbx`) provided they are explicitly declared and matched during the capability handshake. |
| `value` | string | Yes | URI of the resource. Can be **absolute URL** (e.g., `https://.../image.png`) or **relative path** to file in package (e.g., `assets/diagram.png`). |
| `mimeType` | string | Recommended | MIME type of file (e.g., `image/png`, `audio/mpeg`, `video/mp4`, `model/gltf-binary`). |
| `altText` | string | **REQUIRED for images**, optional for audio/video | **Plain Text.** Alternative text for accessibility. Must be plain text without formatting for screen readers. |
| `transcript` | string | No | **Rich Content.** Verbatim transcript of spoken word (for audio/video). For time codes, use WebVTT format (time codes MUST be on separate line, e.g., `00:00:15.000`). For inline formatting, use Markdown. MAY contain mathematical formulas in LaTeX. If present, enables fulltext search and indexing by AI agents without need to download and analyze binary file. Takes precedence over external subtitles. **Accessibility note:** Applications MUST remove all formatting when processing for screen readers and leave only plain text. |
| `caption` | string | No | **Rich Content.** Media caption displayed below/next to media. |
| `width` | number | No | Preferred width in pixels (rendering hint). |
| `height` | number | No | Preferred height in pixels (rendering hint). |
| `start` | number | No | Time in seconds where media playback should start (for audio/video). Default: 0. |
| `end` | number | No | Time in seconds where media playback should end. If not specified, plays to the end. |
| `loop` | boolean | No | For audio/video only. Determines whether media should loop. Default value is `false`. **Rules for combination with `start`/`end`:** (1) `loop: true` + `end`: Loop from `start` to `end`. (2) `loop: true` without `end`: Loop entire file from `start`. (3) `loop: false` + `end`: Play once from `start` to `end`. (4) `loop: false` without `end`: Play once from `start` to end of file (default behavior). **Validation rules:** `start` MUST be >= 0. If `end` is specified, `end > start` MUST hold. If `end` > file length, use end of file. If `start >= end`, Application MUST declare error. If `loop: true` and `start == end`, Application MUST declare error (empty segment). |
| `subtitles` | array | No | For audio/video only. Array of objects defining subtitles. Each object contains: `lang` (string, required): Language code (BCP 47, e.g., `cs`, `en`), `value` (string, required): URI to `.vtt` or `.srt` file (absolute URL or relative path in `.oqse` package), `label` (string, optional): Display name (e.g., "Czech", "English"), `kind` (string, optional): Subtitle type - `captions`, `subtitles`, or `descriptions` per WebVTT specification (default: `subtitles`). Example: `[{"lang": "cs", "value": "assets/subtitles/cs.vtt", "label": "Czech", "kind": "captions"}, {"lang": "en", "value": "assets/subtitles/en.vtt", "label": "English"}]`. **Validation rules:** File format MUST be `.vtt` (recommended) or `.srt`. Value `kind` MUST be one of: `captions`, `subtitles`, `descriptions`. If `label` is missing, use value of `lang`. Application MUST ignore invalid formats with warning. |
| `license` | string | No | SPDX license for this specific media (if different from set). |
| `attribution` | string | No | **Plain Text.** Media author/source attribution (e.g., "Photo: NASA"). |
| `checksums` | object | No | Object for file integrity verification. Key is algorithm name (`"sha256"`, `"sha512"`, `"md5"`, etc.) and value is hexadecimal hash. Example: `{"sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "md5": "098f6bcd4621d373cade4e832627b4f6"}`. Hash is calculated from original **binary data** of file (not from URI string). **Security rules:** For files in `.oqse` package, Application MUST calculate hash after unpacking and compare with values in object. Application MUST support at minimum the `sha256` algorithm. For external URLs: If file is small (< 10 MB), Application MAY download and verify. If file is large (>= 10 MB), Application MAY skip validation and display warning. Application SHOULD allow user to disable checksum validation for streaming media. If hash does not match, Application MUST reject asset and display security warning. If `checksums` is missing, Application MAY use file but SHOULD display warning about unverified integrity. |

**Note:** To use different segments of the same file in one set, define multiple assets in `assets` with the same `value` but different `start` and `end` values.

**Rule for asset keys:** Asset identifier (key used in `assets` and in tag `<asset:key />`) MUST match regular expression `^[a-z0-9_-]+$` (lowercase only). Only lowercase letters, digits, underscores, and hyphens are allowed. Spaces or other special characters are not permitted. Application MUST:
  * On import: Accept uppercase and automatically convert to lowercase with warning
  * On import: Reject (with error) situation where two different names match after conversion to lowercase (collision prevention)
  * On export: Always generate lowercase keys
  * When processing `<asset:... />` tags: Normalize captured token to lowercase before lookup, so syntax is case-insensitive even in user-written text

### 5.1. Media Reference Syntax (Media Tags)

In all text fields with "rich content" (Rich Content), media defined in `assets` are referenced exclusively using the unified self-closing Media Tag syntax:

```
<asset:media_key />
```

This syntax is designed to be unambiguous and not collide with regular text or Markdown formatting.

#### Recommended Processing (Rendering Pipeline)

Given support for GFM (which allows HTML) and custom `<asset />` tags, application MUST follow safe processing order:

1. **Asset Tokenization:** Before rendering, find all occurrences of `<asset:key />` and replace them with unique text placeholder that Markdown processor won't change (e.g., `[[__ASSET_XYZ__]]`).
2. **Markdown Rendering:** Convert text (containing placeholders) using GFM processor to HTML.
3. **Sanitization:** Clean resulting HTML of dangerous elements (scripts, iframes, event handlers) using sanitizer (e.g., DOMPurify).
4. **Detokenization:** Replace back placeholders `[[__ASSET_XYZ__]]` with final safe HTML elements (`<img>`, `<audio>`, etc.).

#### Application Rules

* Application MUST search text for strings matching pattern `<asset:([^ >]+)\s*/>`.
* Tag functions as placeholder. Application MUST completely replace it with corresponding HTML element according to `MediaObject.type` (e.g., `<img>`, `<audio>`, `<video>`).
* Rich Content fields therefore never contain direct HTML tags for media – only these references.
* Application MUST NOT support alternative syntaxes (e.g., Markdown links `[...](asset://...)`).
* Visible media caption is rendered from `MediaObject.caption`, alternative text from `MediaObject.altText`.
* **Time parameters:** If `start` or `end` parameters are defined for YouTube/Vimeo videos, Application **SHOULD** attempt to project them into embed URL (e.g., `?start=30`), since standard HTML attributes for `<iframe>` don't handle this.

**Processing example:**

* Input: `"Look at the graph: <asset:pressure_graph />"`
* Asset definition: `{ "type": "image", "altText": "Pressure over time graph" }`
* Output for renderer: `Look at the graph: <img src="..." alt="Pressure over time graph">`

#### Scope Resolution (Global vs. Local assets)

Media can be defined at two levels:
* `meta.assets` (global) – for media shared between multiple items or set metadata
* `item.assets` (local) – for media specific to one item

**Search rule (Fallback logic):**

1. Application first searches for `key` in `item.assets` dictionary. If found, use this media.
2. If not in `item.assets`, search for `key` in `meta.assets`.
3. If not found anywhere, it is an error (missing media).

If same key exists in both scopes, local definition (`item.assets`) takes precedence. **Note:** Application MUST log warning about shadowing of global asset and SHOULD recommend author use unique keys to prevent confusion.

**Example JSON (local assets):**

```json
{
  "assets": {
    "img_raptor": { "type": "image", "value": "https://.../raptor.jpg", "altText": "Official Raptor engine image" },
    "snd_start": { "type": "audio", "value": "assets/start.mp3" }
  },
  "question": "What is in the image? <asset:img_raptor /> And what sound does it make? <asset:snd_start />"
}
```

**Example JSON (reusability with global assets):**

```json
{
  "meta": {
    "title": "Geography of Europe",
    "assets": {
      "europe_map": {
        "type": "image",
        "value": "https://example.com/europe-map.jpg",
        "altText": "Political map of Europe",
        "license": "CC-BY-SA-4.0"
      }
    }
  },
  "items": [
    {
      "id": "019aa5eb-5c91-7bce-93db-fb427ea4f333",
      "type": "short-answer",
      "question": "Where is Prague on the map? <asset:europe_map />",
      "answers": ["Prague"]
    },
    {
      "id": "019aa5eb-902b-781e-81b7-0fd9e37b43f1",
      "type": "short-answer",
      "question": "Where is Berlin on the map? <asset:europe_map />",
      "answers": ["Berlin"]
    }
  ]
}
```

**Note:** Both questions use the same `europe_map` media from `meta.assets` – no need to duplicate. Application ensures replacement of `<asset:europe_map />` with correct HTML tag in each item.

-----

## 6. Item Types (`item.type`)

The specification in the current version defines **22 official item types**. Each application MUST clearly identify the type using the `type` key, which determines what other processing logic is applied.

### 6.1. `type: "note"` (Study Note)

  * `title` (string, optional): **Plain Text.** Note heading.
  * `content` (string, required): **Rich Content.** Main educational content of the item (text, Markdown, LaTeX, media references).
  * `hiddenContent` (string, optional): **Rich Content.** Additional content that is initially hidden (e.g., answer to a self-check question, detailed derivation, or spoiler). User must perform an action to reveal it.

**Example:**
```json
{
  "id": "019aa5ec-3daa-796f-9289-01c6214ec2b3",
  "type": "note",
  "title": "Introduction to Thermodynamics",
  "content": "Thermodynamics is a branch of physics dealing with heat, work, and temperature. What is the First Law?",
  "hiddenContent": "The **First Law of Thermodynamics** states that energy cannot be created or destroyed, only transferred or changed from one form to another."
}
```

### 6.2. `type: "flashcard"` (Flashcard)

  * `front` (string, required): **Rich Content.** Text on front side.
  * `back` (string, required): **Rich Content.** Text on back side.

**Example:**
```json
{
  "id": "019aa5ef-1d0e-7cb5-b894-ce83cfd04f70",
  "type": "flashcard",
  "assets": {
    "img1": {
      "type": "image",
      "value": "https://example.com/raptor.jpg",
      "altText": "Raptor Engine"
    }
  },
  "front": "What is the name of the engine in the image? <asset:img1 />",
  "back": "**Raptor** - engine developed by SpaceX."
}
```

### 6.3. `type: "true-false"` (True/False)

  * `question` (string, required): **Rich Content.** Statement to be evaluated.
  * `answer` (boolean, required): Correct answer (`true` or `false`).

**Example:**
```json
{
  "id": "019aa5ef-acd6-78ce-b953-d0ef601d13aa",
  "type": "true-false",
  "question": "Earth is the closest planet to the Sun.",
  "answer": false,
  "explanation": "Mercury is the closest planet to the Sun. Earth is the third planet from the Sun."
}
```

### 6.4. `type: "mcq-single"` (Single Choice)

  * `question` (string, required): **Rich Content.** Question text.
  * `options` (string[], required): **Rich Content.** Array of text options. Must contain at least 2 items.
  * `correctIndex` (number, required): Index (0, 1, 2...) of correct answer in `options` array.
  * `shuffleOptions` (boolean, optional): Whether application should shuffle options. Default: `true`.
  * `optionExplanations` (Array<string | null>, optional): **Rich Content.** Array of explanations specific to each option. Index in this array corresponds to index in `options` array. If specific option doesn't require explanation (e.g., it's obvious), value `null` may be at that position.

**Example:**
```json
{
  "id": "019aa5f0-60c7-790c-abca-4c6e97af05da",
  "type": "mcq-single",
  "question": "Which engine was used on the 1st stage of the **Saturn V** rocket?",
  "options": [
    "Raptor",
    "Merlin",
    "F-1"
  ],
  "correctIndex": 2,
  "shuffleOptions": true,
  "explanation": "Five **F-1** engines powered the first stage of Saturn V."
}
```

### 6.5. `type: "mcq-multi"` (Multiple Choice)

  * `question` (string, required): **Rich Content.** Question text.
  * `options` (string[], required): **Rich Content.** Array of text options. Must contain at least 2 items.
  * `correctIndices` (number[], required): Array of indices of correct answers. Must contain at least 1 index.
  * `minSelections` (number, optional): Minimum number of answers user must select.
  * `maxSelections` (number, optional): Maximum number of answers user can select.
  * `shuffleOptions` (boolean, optional): Whether application should shuffle options. Default: `true`.
  * `optionExplanations` (Array<string | null>, optional): **Rich Content.** Array of explanations specific to each option. Index in this array corresponds to index in `options` array. If specific option doesn't require explanation (e.g., it's obvious), value `null` may be at that position.

**Example:**
```json
{
  "id": "019aa5f0-ad74-7e5a-ad52-aedbc02c6b33",
  "type": "mcq-multi",
  "question": "Which of the following planets are gas giants?",
  "options": [
    "Jupiter",
    "Mars",
    "Saturn",
    "Earth",
    "Neptune"
  ],
  "correctIndices": [0, 2, 4],
  "minSelections": 1,
  "shuffleOptions": true,
  "explanation": "The gas giants of the solar system are: **Jupiter**, **Saturn**, **Uranus**, and **Neptune**."
}
```

### 6.6. `type: "short-answer"` (Short Text Answer)

  * `question` (string, required): **Rich Content.** Question text.
  * `answers` (string[], required): **Plain Text.** Array of acceptable text answers (for checking variants). Must contain at least 1 item.
  * `caseSensitive` (boolean, optional): Distinguish letter case. Default: `false`.
  * `trimWhitespace` (boolean, optional): Ignore spaces at beginning/end. Default: `true`.
  * `acceptPartial` (boolean, optional): Accept approximate match (fuzzy matching). Allows answers with minor typos using Levenshtein distance (max. 1-2 edit operations: insertion, deletion, character substitution). Default: `false`.
  * `ignoreDiacritics` (boolean, optional): If `true`, application removes diacritics from user input and from `answers` array before comparison (e.g., "citron" will match "citrón"). Default: `false`.

**Example:**
```json
{
  "id": "019aa5f1-7cb7-7f8a-a085-98ae208b25ec",
  "type": "short-answer",
  "question": "What is the capital of the Czech Republic?",
  "answers": ["Prague", "praha"],
  "caseSensitive": false,
  "trimWhitespace": true,
  "hints": ["City on the Vltava River", "Starts with letter P"]
}
```

### 6.7. `type: "fill-in-blanks"` (Fill in the Blanks)

  * `question` (string, optional): **Rich Content.** Heading or instructions.
  * `text` (string, required): **Rich Content.** Text with blanks marked using blank tags `<blank:token />` (e.g., `<blank:1 />`). **Token rules:** Token MUST be alphanumeric identifier (`a-z`, `A-Z`, `0-9`, `_`, `-`). Tokens are case-sensitive (`<blank:A />` ≠ `<blank:a />`). Maximum length: 64 characters. Regex: `^[a-zA-Z0-9_-]{1,64}$`. **Valid token examples:** `<blank:1 />`, `<blank:q1 />`, `<blank:answer_A />`, `<blank:first-name />`. Syntax is consistent with Media Tag (`<asset:key />`) for easier parsing. **Duplicate tokens:** If same token (e.g., `<blank:1 />`) occurs multiple times in text, all its occurrences represent **the same** input field. Application SHOULD ensure that when one occurrence is filled, other occurrences with same token are automatically filled as well.
  * `blanks` (object, required): Dictionary (map), where key is `token` and value is array `string[]` (**Plain Text**) of correct answers. Must contain at least 1 `token`.
  * `caseSensitive` (boolean, optional): Distinguish letter case when checking answers. Default: `false`.
  * `trimWhitespace` (boolean, optional): Ignore spaces at beginning and end of answer. Default: `true`.

**Validation rules:**
- All keys in `blanks` object MUST exist as blank tags `<blank:key />` in `text` field
- All blank tags `<blank:key />` in `text` field MUST have corresponding key in `blanks` object
- Application MUST declare error on mismatch
- Application MUST search for blank tags using regex pattern `<blank:([a-zA-Z0-9_-]{1,64})\s*/>`

**Example:**
```json
{
  "id": "019aa5f2-453b-7c46-8a8b-7d868cfd79cd",
  "type": "fill-in-blanks",
  "question": "Fill in the missing information about planet Earth:",
  "text": "Earth is the <blank:1 /> planet from the Sun. It has <blank:2 /> natural satellite called <blank:3 />.",
  "blanks": {
    "1": ["third", "3rd", "3"],
    "2": ["one", "1"],
    "3": ["Moon", "the Moon"]
  }
}
```

### 6.8. `type: "fill-in-select"` (Fill in with Selection)

* `question` (string, optional): **Rich Content.** Heading or instructions.
* `text` (string, required): **Rich Content.** Text with blanks marked using blank tags `<blank:token />` (e.g., `<blank:1 />`).
* `blanks` (object, required): Dictionary (map), where key is `token` (e.g., `"1"`) and value is `SelectBlankObject` object ([see section 7.1](#71-selectblankobject-for-fill-in-select)).

**Example:**
```json
{
  "id": "019aa5f3-b525-7146-be57-8f010e276845",
  "type": "fill-in-select",
  "question": "Select the correct answers in the text:",
  "text": "The Sun is a <blank:1 /> and Earth orbits around it every <blank:2 /> days.",
  "blanks": {
    "1": {
      "options": ["star", "planet", "moon"],
      "correctIndex": 0
    },
    "2": {
      "options": ["30", "365", "24"],
      "correctIndex": 1
    }
  }
}
```

### 6.9. `type: "match-pairs"` (Match Pairs)

  * `question` (string, optional): **Rich Content.** Instructions.
  * `prompts` (string[], required): **Rich Content.** Left side (what is being matched) - array of strings. Must contain at least 2 items.
  * `matches` (string[], required): **Rich Content.** Right side (target) - array of strings. Must have same length as `prompts`. Minimum length: 2 (at least 2 pairs). Maximum length: 100 items per [section 9.1](#91-length-and-size-constraints).
  * **Note:** `prompts[0]` belongs to `matches[0]`, etc. Application shuffles pairs before display.

**Example:**
```json
{
  "id": "019aa5f4-187a-7bb1-8a16-c461ea8a6839",
  "type": "match-pairs",
  "question": "Match planets with their characteristics:",
  "prompts": [
    "Mars",
    "Jupiter",
    "Saturn"
  ],
  "matches": [
    "Red planet",
    "Largest planet",
    "Planet with rings"
  ]
}
```

### 6.10. `type: "match-complex"` (Advanced Matching)

  * `question` (string, optional): **Rich Content.** Instructions.
  * `leftItems` (string[], required): **Rich Content.** Items on left side.
  * `rightItems` (string[], required): **Rich Content.** Items on right side.
  * `connections` (number[][], required): Array of index pairs `[left_index, right_index]` defining correct pairs.
  * `minCorrect` (number, optional): Minimum number of correct connections required for success. If not specified, user must find all connections in `connections`.
  * **Note:** This type explicitly supports more complex graph structures:
    * Multiple connections are allowed in both directions (`1:N`, `N:1`, `N:M`).
    * Isolated items (distractors) are allowed.
    * Application MUST validate that each index in pair `[left, right]` falls within range of respective array. If index doesn't exist, import MUST stop with error.
    * If two different connections reference same `[left, right]`, Application MUST reject duplicity (has no benefit and complicates evaluation).

**Example:**
```json
{
  "id": "019aa5f5-3f94-78d4-a9dc-6a0cd3a1a7df",
  "type": "match-complex",
  "question": "Match capitals with countries (some cities are extra):",
  "leftItems": ["France", "Germany", "Spain"],
  "rightItems": ["Paris", "Berlin", "Madrid", "London", "Rome"],
  "connections": [
    [0, 0],
    [1, 1],
    [2, 2]
  ]
}
```

**Example with multiple connections and distractors:**
```json
{
  "id": "019aa5f5-907f-7373-aeed-128158901d17",
  "type": "match-complex",
  "question": "Match rockets to their main engines (some options are extra):",
  "leftItems": ["Starship", "Falcon 9", "Space Launch System"],
  "rightItems": ["Raptor", "Merlin", "RS-25", "BE-4"],
  "connections": [
    [0, 0],
    [0, 3],
    [1, 1],
    [2, 2]
  ],
  "minCorrect": 3
}

```
In the example above, `Starship` has two correct connections (`Raptor` and `BE-4`), demonstrating the `1:N` matching capability. All four right-side items are referenced as correct answers — an item without any connection to the left side would be a distractor. Application MUST still maintain index order and ensure no index exceeds defined arrays.

### 6.11. `type: "sort-items"` (Sorting)

  * `question` (string, required): **Rich Content.** Instructions.
  * `items` (string[], required): **Rich Content.** Array of items in **correct** order. Must contain at least 2 items and application MUST shuffle them.

**Example:**
```json
{
  "id": "019aa5f6-e38b-70f2-898e-a13562b77963",
  "type": "sort-items",
  "question": "Sort planets by distance from the Sun:",
  "items": [
    "Mercury",
    "Venus",
    "Earth",
    "Mars"
  ]
}
```

### 6.12. `type: "slider"` (Slider / Numeric Answer)

  * `question` (string, required): **Rich Content.** Question text.
  * `min` (number, required): Minimum value on slider.
  * `max` (number, required): Maximum value on slider.
  * `step` (number, required): Slider step (e.g., 1, 0.1). Must be > 0. RECOMMENDED: `step` SHOULD be such that `(max - min) / step` gives whole number (e.g., `max: 100, min: 0, step: 5` → 20 steps).
  * `correctAnswer` (number, required): Correct value. MUST be reachable by slider: `(correctAnswer - min) % step === 0` and `correctAnswer` MUST lie in interval `<min, max>`.
  * `tolerance` (number, required): Allowed deviation (can be `0`). **Validation rules:** `tolerance >= 0` and `tolerance <= (max - min) / 2`. RECOMMENDED: `tolerance` should be multiple of `step` (e.g., `step: 5, tolerance: 10`), otherwise inconsistent answer evaluation may occur. If `tolerance % step != 0`, Application MUST issue warning about possible inconsistency.
  * `unit` (string, optional): **Plain Text.** Unit (e.g., "year", "m", "°C").

**Example:**
```json
{
  "id": "019aa5f8-7e0b-70e6-b69b-16ce3886b447",
  "type": "slider",
  "question": "In what year did the first human land on the Moon?",
  "min": 1950,
  "max": 2000,
  "step": 1,
  "correctAnswer": 1969,
  "tolerance": 0,
  "unit": "year",
  "explanation": "Neil Armstrong and Buzz Aldrin landed on the Moon on July 20, **1969** during the Apollo 11 mission."
}
```

### 6.13. `type: "pin-on-image"` (Pin on Image)

  * `question` (string, required): **Rich Content.** Instructions.
  * `targetAsset` (string, required): **Key from `assets`**, which determines the image to be clicked on.
  * `hotspots` (HotspotObject[], required): Array defining correct areas. Must contain at least 1 hotspot. [See section 7.2](#72-hotspotobject-for-pin-on-image).
  * `multipleCorrect` (boolean, optional): Determines whether user must mark more than one hotspot. Default: `false` (one click is enough).
  * `minCorrect` (number, optional): If `multipleCorrect: true`, determines minimum number of correct hotspots user must find. If `multipleCorrect: false` or missing, this field is ignored.

**Example:**
```json
{
  "id": "019aa5f8-eff5-7bb4-8cec-964b6664e476",
  "type": "pin-on-image",
  "assets": {
    "map1": {
      "type": "image",
      "value": "https://example.com/europe-map.jpg",
      "altText": "Map of Europe"
    }
  },
  "question": "Click on Prague on the map.",
  "targetAsset": "map1",
  "hotspots": [
    {
      "type": "circle",
      "x": 50,
      "y": 50,
      "radius": 5,
      "label": "Prague"
    }
  ]
}
```

### 6.14. `type: "categorize"` (Categorization)

  * `question` (string, required): **Rich Content.** Instructions.
  * `categories` (string[], required): **Plain Text.** Array of category names. Must contain at least 2 items.
  * `items` (CategorizeItem[], required): Items to sort. Each item references category using 0-based index. [See section 7.3](#73-categorizeitem-for-categorize).
  * **Note:** User assigns each item to a category.

**Example:**
```json
{
  "id": "019aa5fa-086e-76c5-9731-a872689f1112",
  "type": "categorize",
  "question": "Sort animals into categories:",
  "categories": ["Mammals", "Birds", "Fish"],
  "items": [
    {
      "id": "item1",
      "text": "Dolphin",
      "correctCategoryIndex": 0
    },
    {
      "id": "item2",
      "text": "Eagle",
      "correctCategoryIndex": 1
    },
    {
      "id": "item3",
      "text": "Shark",
      "correctCategoryIndex": 2
    },
    {
      "id": "item4",
      "text": "Penguin",
      "correctCategoryIndex": 1
    }
  ]
}
```

### 6.15. `type: "timeline"` (Timeline)

  * `question` (string, required): **Rich Content.** Instructions.
  * `events` (TimelineEvent[], required): Array of events in correct chronological order. Must contain at least 2 events. [See section 7.4](#74-timelineevent-for-timeline) for detail on date handling.
  * `randomize` (boolean, optional): Determines whether application should shuffle events before displaying to user. Default: `true`. Set to `false` if you want to display events as study material in chronological order.

**Example:**
```json
{
  "id": "019aa5fb-932c-7ac0-900b-af794143124a",
  "type": "timeline",
  "question": "Sort events from space flight history:",
  "events": [
    {
      "id": "ev1",
      "text": "First human in space (Yuri Gagarin)",
      "date": "1961-04-12T00:00:00Z",
      "precision": "day"
    },
    {
      "id": "ev2",
      "text": "First Moon landing (Apollo 11)",
      "date": "1969-07-20T00:00:00Z",
      "precision": "day"
    },
    {
      "id": "ev3",
      "text": "First space shuttle flight (Columbia)",
      "date": "1981-04-12T00:00:00Z",
      "precision": "day"
    }
  ]
}
```

### 6.16. `type: "matrix"` (Matrix / Table Answer)

  * `question` (string, required): **Rich Content.** Instructions.
  * `rows` (string[], required): **Plain Text.** Row labels. Must not be empty array.
  * `columns` (string[], required): **Plain Text.** Column labels. Must not be empty array.
  * `correctCells` (number[][], required): Array of coordinates of correct answers in format `[row, column]`. Indices are 0-based. Example: `[[0, 1], [2, 0]]` marks correct answer in 1st row/2nd column and 3rd row/1st column.
  * `multiplePerRow` (boolean, optional): Can user select multiple answers in one row? Default: `false`.
  * **Note:** Useful for "Which of the following statements are true?" type questions.

**Example:**
```json
{
  "id": "019aa5fb-d486-7225-8741-0f714b2ae057",
  "type": "matrix",
  "question": "Mark which properties apply to which planets:",
  "rows": ["Mars", "Jupiter", "Saturn"],
  "columns": ["Has rings", "Is gas giant", "Has red color"],
  "correctCells": [
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 1]
  ],
  "multiplePerRow": true
}
```

### 6.17. `type: "math-input"` (Math Input)

  * `question` (string, required): **Rich Content.** Question text.
  * `correctAnswer` (string, required): Correct answer in LaTeX format (e.g., `$2x + 2$`).
  * `alternativeAnswers` (string[], optional): Array of other **LaTeX strings** (same format as `correctAnswer`) that should also be considered correct (e.g., `$2*x + 2$`, `$2+2x$`).
  * `tolerance` (number, optional): For purely numeric answers, allowed numeric deviation.
  * **Implementation note:** Application **SHOULD** support symbolic checking of mathematical equivalence (e.g., recognize `$2+2x$` same as `$2x+2$`). All LaTeX notations MUST be compatible with web rendering libraries (KaTeX, MathJax). If application does not support symbolic checking (e.g., due to technical limitations), it **MUST** use plain string comparison. **String comparison rules:** (1) Normalize whitespace (remove all spaces inside LaTeX). (2) Compare string with `correctAnswer` and each item in `alternativeAnswers`. (3) Case-sensitive. (4) DO NOT convert symbols (e.g., `*` stays `*`, not rewritten to `\cdot`). **Recommendations for set authors:** Prefer normalized form without spaces if Application doesn't support symbolic mathematical checking (CAS). Include all common notation variants in `alternativeAnswers`. Example: `correctAnswer: '$2x+2$', alternativeAnswers: ['$2*x+2$', '$2 x + 2$', '$2+2x$']`.

**Example:**

```json
{
  "id": "018c84f1-5e1a-7b3d-9f2e-4a6c8d0f1e3a",
  "type": "math-input",
  "difficulty": 4,
  "question": "Simplify the following expression: $2(x+1)$",
  "correctAnswer": "$2x + 2$",
  "alternativeAnswers": [
    "$2*x + 2$"
  ]
}
```

### 6.18. `type: "diagram-label"` (Diagram Labeling)

  * `question` (string, required): **Rich Content.** Instructions.
  * `targetAsset` (string, required): **Key from `assets`**, which determines the diagram image.
  * `labels` (string[], required): **Rich Content.** Array of text labels for user to assign. Must contain all correct answers and may contain distractors (extra labels).
  * `caseSensitive` (boolean, optional): Distinguish letter case when comparing labels. Default: `false`. Applies globally to all zones in this item.
  * `requireTyping` (boolean, optional): Default `false`. If `true`, application MUST NOT display draggable labels; instead render text fields for each zone and compare user input with `labels[correctLabelIndex]` (respects `caseSensitive`, also recommended to trim whitespace). Value `true` therefore activates "type answer" mode without needing to change `labels` structure.
  * `zones` (object[], required): Array of zones on image. Each zone is defined as extended `HotspotObject` ([see section 7.2](#72-hotspotobject-for-pin-on-image)) with added `correctLabelIndex` key.

**Zone structure in `zones` array:**
  * All properties of `HotspotObject` (`type`, `x`, `y`...).
  * `correctLabelIndex` (number, required): Index of correct label from `labels` array (0-based).
  * For point definition, circle with small radius can be used

**Example:**
```json
{
  "id": "019aa5fd-24da-7d70-ba5e-d81414c25743",
  "type": "diagram-label",
  "question": "Assign names to parts of the cell:",
  "targetAsset": "img_cell",
  "assets": {
    "img_cell": {
      "type": "image",
      "value": "https://example.com/cell.png",
      "altText": "Cell diagram"
    }
  },
  "labels": ["Nucleus", "Mitochondria", "Ribosome"],
  "zones": [
    {
      "type": "rect",
      "x": 10,
      "y": 10,
      "width": 20,
      "height": 20,
      "correctLabelIndex": 0
    },
    {
      "type": "circle",
      "x": 50,
      "y": 50,
      "radius": 10,
      "correctLabelIndex": 1
    }
  ]
}
```
  If item should require independent writing of names instead of dragging, set `requireTyping: true`. In that case, application displays input field for each zone and answer is compared with text from `labels` array according to corresponding `correctLabelIndex`.

### 6.19. `type: "open-ended"` (Open-Ended Answer)

Intended for questions requiring free text answer that cannot be easily machine-compared (as with `short-answer`). Evaluation often requires teacher or advanced AI.

  * `question` (string, required): **Rich Content.** Question text.
  * `minWords` (number, optional): Minimum required word count.
  * `maxWords` (number, optional): Maximum allowed word count.
  * `sampleAnswer` (string, optional): **Rich Content.** Sample (model) answer for evaluators.
  * `rubric` (object, optional): Structured evaluation criteria.

**Structure of `rubric` object:**
  * `criteria` (object[]): Array of criteria. Each criterion has:
    * `label` (string, **required**): Criterion name (e.g., "Grammar", "Argumentation").
    * `percentage` (number, **required**): Criterion weight in percentages (0-100). **Validation rules:** Each `percentage` MUST be >= 0 and <= 100. Sum of all `percentage` in `criteria` array SHOULD be 100. If sum ≠ 100: If sum > 0, application normalizes proportionally (e.g., [30, 30] → [50%, 50%]). If sum == 0, Application MUST declare error (cannot evaluate). If `criteria` array is empty, `rubric` is ignored.
    * `description` (string, optional): Description of what is evaluated in this criterion.

**Example:**
```json
{
  "id": "019aa5fe-75da-7a8e-8c0b-f2297a6524a8",
  "type": "open-ended",
  "question": "Explain the impacts of the Industrial Revolution on society.",
  "minWords": 100,
  "maxWords": 500,
  "rubric": {
    "criteria": [
      {
        "label": "Factual Accuracy",
        "percentage": 50,
        "description": "Stating correct dates and events."
      },
      {
        "label": "Text Structure",
        "percentage": 30,
        "description": "Introduction, body, conclusion."
      },
      {
        "label": "Grammar and Style",
        "percentage": 20
      }
    ]
  }
}
```

### 6.20. `type: "numeric-input"` (Numeric Input)

Intended for physics, chemistry, statistics, or math problems where answer is specific number (integer or float), not algebraic expression (for that use `math-input`). This type ensures numeric keyboard display on mobile devices.

  * `question` (string, required): **Rich Content.** Question text.
  * `value` (number, required): Correct numeric value (float). Used for evaluation when `range` is not specified. If `range` is present, `value` is not used for evaluation; it SHOULD nonetheless be set to a representative value within the range (e.g., the midpoint) to keep the field consistently populated.
  * `tolerance` (number, optional): Absolute allowed deviation. Default: `0`. Answer is correct if: `|user_value - value| <= tolerance`. Ignored when `range` is specified.
  * `range` (object, optional): Alternative to `value`+`tolerance`. Object `{ "min": number, "max": number }`. If specified, overrides `value`+`tolerance`. Answer is correct if it lies in closed interval `<min, max>`.
  * `unit` (string, optional): **Plain Text.** Unit displayed after input field (e.g., "kg", "m/s", "%"). Serves only for visual context, not compared.

**Implementation rules for applications:**
Applications **MUST** normalize user input before evaluation to handle localization differences:

1.  Replace decimal comma `,` with period `.`.
2.  Remove spaces (e.g., from `1 000` to `1000`).
3.  Applications SHOULD accept input formatting per device locale, but internally always compare with `value` as type `number` (float).

**Example:**

```json
{
  "id": "019aa5fe-9a6c-79dc-8b0e-dae22f9247fe",
  "type": "numeric-input",
  "question": "What is the approximate value of gravitational acceleration on Earth?",
  "value": 9.81,
  "tolerance": 0.1,
  "unit": "m/s²"
}
```

### 6.21. `type: "pin-on-model"` (Pin on 3D Model)

  * `question` (string, required): **Rich Content.** Instructions.
  * `targetAsset` (string, required): **Key from `assets`**, which determines the 3D model to be used.
  * `hotspots` (HotspotObject[], required): Array defining correct meshes/parts of the model.
  * `multipleCorrect` (boolean, optional): Determines whether user must find more than one target. Default: `false`.
  * `camera` (object, optional): Recommended initial camera setup.
    * `position` (object): `{x, y, z}` coordinates for the camera's location.
    * `target` (object): `{x, y, z}` coordinates of the point the camera is looking at and orbiting around.
  * **Note:** If `camera` is omitted, the application SHOULD automatically compute the bounding box of the model, set the target to its center, and position the camera to fit the entire model in the view.
  * **Validation rules:** Referenced asset in `targetAsset` **MUST** be of type `model` ([see section 5.](#5-the-mediaobject-object)).

**Example:**
```json
{
  "id": "019aa5ff-1b3c-745a-93de-cfe33451a9fe",
  "type": "pin-on-model",
  "question": "Find and click on the **Femur** (thigh bone).",
  "targetAsset": "model_lower_limb",
  "hotspots": [
    { "type": "mesh", "targetName": "Femur" }
  ],
  "camera": {
    "position": { "x": 10, "y": 5, "z": 10 },
    "target": { "x": 0, "y": 1.5, "z": 0 }
  },
  "assets": {
    "model_lower_limb": {
      "type": "model",
      "value": "assets/lower-limb.glb",
      "mimeType": "model/gltf-binary"
    }
  }
}
```

### 6.22. `type: "chess-puzzle"` (Chess Puzzle)

  * `question` (string, required): **Rich Content.** Instructions or puzzle description (e.g., "White to move and checkmate in 2").
  * `fen` (string, required): The board position in Forsyth–Edwards Notation (FEN).
  * `answers` (string[][], required): Array of correct move sequences. Each sequence is an array of strings in Standard Algebraic Notation (SAN) (e.g., `["e4", "e5", "Nf3"]`). Supports multiple valid solutions.
  * `elo` (number, optional): ELO rating of the puzzle difficulty.
  * **Note:** Applications SHOULD provide an interactive chessboard. The user solves the puzzle by making moves on the board.

**Example:**
```json
{
  "id": "019aa600-abc1-7234-b678-c0ffee000001",
  "type": "chess-puzzle",
  "question": "Find the best move for White.",
  "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  "answers": [
    ["Ng5"]
  ],
  "elo": 1200
}
```

-----

## 7. Helper Data Structures

### 7.1. `SelectBlankObject` (for `fill-in-select`)

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `options` | string[] | Yes | **Rich Content.** Array of text options to choose from. Must not be empty array. |
| `correctIndex` | number | Yes | Index of correct answer in `options` array (0-based). |

### 7.2. `HotspotObject` (for `pin-on-image` and `pin-on-model`)

Defines clickable zone on image or named mesh in a 3D model. For `pin-on-image`, all coordinates and dimensions are in **percentages** (0.0 to 100.0) relative to the image. For `pin-on-model`, the `mesh` type is used instead (no coordinates).

  * `type` (string, required): Zone shape (`rect`, `circle`, `polygon`).
  * `label` (string, optional): **Plain Text.** Zone label.

**For `type: "rect"` (rectangle):**

  * `x` (number): Percent X from left edge.
  * `y` (number): Percent Y from top edge.
  * `width` (number): Width in percentages.
  * `height` (number): Height in percentages.

**For `type: "circle"` (circle):**

  * `x` (number): Center X in percentages.
  * `y` (number): Center Y in percentages.
  * `radius` (number): Radius in percentages.

**For `type: "polygon"` (polygon):**

  * `points` (object[]): Array of points defining shape. Each point is `{ "x": number, "y": number }`.

**For `type: "mesh"` (3D model part):**
  * `targetName` (string): Name (or partial name) of the object/mesh in the 3D scene (glTF node name).

### 7.3. `CategorizeItem` (for `categorize`)

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Recommended | **Plain Text.** Unique ID of item (within question, doesn't have to be UUIDv7). |
| `text` | string | Yes | **Rich Content.** Item text. |
| `correctCategoryIndex` | number | Yes | 0-based index into `categories` array in parent item. |

**Example:**
```json
{
  "id": "019aa600-0cf8-7dc7-8493-925641accc35",
  "type": "categorize",
  "question": "Sort animals into categories:",
  "categories": ["Mammals", "Birds", "Fish"],
  "items": [
    {
      "id": "item1",
      "text": "Dolphin",
      "correctCategoryIndex": 0
    },
    {
      "id": "item2",
      "text": "Eagle",
      "correctCategoryIndex": 1
    }
  ]
}
```

### 7.4. `TimelineEvent` (for `timeline`)

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Recommended | **Plain Text.** Unique ID of event (within question, doesn't have to be UUIDv7). |
| `text` | string | Yes | **Rich Content.** Event description. |
| `date` | string | Yes | **Plain Text.** Event date in strict format per section 9.5. Field `date` MUST always contain full date in ISO 8601 format (e.g., `1969-01-01` or `1969-01-01T12:00:00Z`), even if `precision` is set to only `year` or `month`. Field `precision` determines only display format to user, but for internal sorting and machine processing, complete date is always required. MUST NOT be displayed to user before answering. Event without `date` is invalid and application MUST reject import. |
| `precision` | string | No | **Plain Text.** Determines mask for displaying date to user. Possible values: `year`, `month`, `day`, `datetime`. If not specified, full precision defined in `date` field is used. This field is key for displaying "imprecise" historical dates (e.g., "year 1969" stored technically as `1969-01-01`).

**Rules for sorting events:** (1) If two events have same date base corresponding to lower precision (e.g., both have year `1969`, one with `precision: "year"` and other with `precision: "month"` or more precise), both orders are considered correct. (2) Events with same precision and same date are considered simultaneous (any order is correct). (3) For comparison purposes, least precise value from pair is used. Example: `{"date": "1969-01-01", "precision": "year"}` and `{"date": "1969-07-20", "precision": "day"}` are considered concurrent (both in year 1969). |

**Example:**
```json
{
  "id": "019aa600-3e91-73cf-b990-c05ecea1a4b9",
  "type": "timeline",
  "question": "Sort events from space flight history:",
  "events": [
    {
      "id": "ev1",
      "text": "First human in space (Yuri Gagarin)",
      "date": "1961-04-12T00:00:00Z",
      "precision": "day"
    },
    {
      "id": "ev2",
      "text": "First Moon landing (Apollo 11)",
      "date": "1969-07-20T00:00:00Z",
      "precision": "day"
    }
  ]
}
```

### 7.5. `TranslationObject` (for `meta.translations`)

Defines reference to translated version of this set.

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `lang` | string | Yes | **Plain Text.** Language code (BCP 47) of translated set (e.g., "en-US"). |
| `id` | string | Yes | Unique UUID (`meta.id`) of translated set. Each language version MUST have unique UUID. `meta.id` of translated set MUST NOT be same as original. |
| `title` | string | Yes | **Plain Text.** Name of translated set (for quick display in menu). |
| `downloadUrl` | string | No | **URI (absolute URL).** Link to download translated set if application doesn't have it available. |

**Best practice:**
- Recommended to create "sibling" relationship between translations (each translation references other translations in `translations` array)

### 7.6. `LinkedSetObject` (for `meta.prerequisites` and `meta.relatedSets`)

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | UUID of OQSE set being referenced. |
| `title` | string | Yes | **Plain Text.** Name of referenced set for UI display. |
| `downloadUrl` | string | No | **URI (absolute URL).** Absolute address for downloading set if application doesn't have it available. |

### 7.7. `SourceReference` (for `item.sources`)

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | **Plain Text.** ID of source defined in `meta.sourceMaterials`. All `id` in `SourceReference` MUST exist in `meta.sourceMaterials`. Application MUST ignore non-existent references with warning. Application SHOULD NOT block item display due to missing source. |
| `location` | string | No | **Plain Text.** Specification of place in source (e.g., "page 42", "time 12:30", "paragraph 3"). |
| `quote` | string | No | **Rich Content.** Exact citation or text segment from source that directly supports correctness of answer. MAY contain formatting (bold text, italics) and mathematical formulas in LaTeX. This key is critical for automated fact-checking and AI systems like RAG (Retrieval Augmented Generation), so they can verify that generated question corresponds to source materials. |

### 7.8. The `Pedagogy` Object (Adaptive Difficulty)

This optional object (`item.pedagogy`) serves to store advanced metadata about didactic properties of item. It is key for adaptive testing (CAT) and data sharing between systems.

| Key | Type | Description |
| :--- | :--- | :--- |
| `bloomLevel` | string | Level according to revised Bloom's taxonomy. Allowed values: `remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`. Application MUST declare error for other value (including typos like `analyse`). |
| `irtDifficulty` | number | IRT Parameter *b* (Difficulty). Determines what level of student ability is needed for 50% chance of correct answer. Typically range -3.0 to +3.0. If present and application supports IRT, takes precedence over simple `item.difficulty`. |
| `irtDiscrimination` | number | IRT Parameter *a* (Discrimination). How well question distinguishes between strong and weak students. |
| `irtGuessing` | number | IRT Parameter *c* (Pseudo-guessing). Probability of guessing answer by chance (e.g., 0.25 for ABCD test). |
| `avgTime` | number | Average time (in seconds) students actually need to solve (measured from data). |
| `cognitiveLoad` | string | Subjective cognitive load (`low`, `medium`, `high`). |
| `partialCredit` | boolean | Whether item supports partial scoring (e.g., 2 out of 3 correct answers in `mcq-multi`). |
| `penaltyPerWrong` | number | Penalty for each wrong choice (0.0 - 1.0). E.g., 0.5 means loss of half of total question points for wrong answer. |

**Example:**
```json
"pedagogy": {
  "bloomLevel": "analyze",
  "irtDifficulty": 0.5,
  "irtDiscrimination": 0.8,
  "irtGuessing": 0.25,
  "avgTime": 45,
  "cognitiveLoad": "medium"
}
```

-----

## 8. Complete Example File

```json
{
  "$schema": "https://memizy.com/schemas/oqse/v0.1.json",
  "version": "0.1",
  "meta": {
    "id": "019aa606-cbb5-7b2e-9e61-ac335db1eb4b",
    "title": "Rocket Science Basics 🚀",
    "language": "en",
    "ageMin": 15,
    "subject": "physics",
    "createdAt": "2025-11-14T08:00:00Z",
    "updatedAt": "2025-11-17T10:00:00Z",
    "author": {
      "name": "John Smith",
      "role": "Content Author",
      "url": "https://github.com/johnsmith"
    },
    "contributors": [
      {
        "name": "Jane Doe",
        "role": "Editor"
      },
      {
        "name": "Dr. Robert Brown",
        "role": "Subject Matter Expert",
        "email": "robert.brown@example.edu"
      }
    ],
    "license": "CC-BY-SA-4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "thumbnail": "cover_image",
    "assets": {
      "cover_image": {
        "type": "image",
        "value": "https://example.com/rocket-cover.jpg",
        "altText": "Starship rocket on launch pad",
        "license": "CC-BY-SA-4.0",
        "attribution": "SpaceX"
      }
    },
    "estimatedTime": 20,
    "tags": ["Physics", "Rocket Engine"],
    "requirements": {
      "features": ["markdown", "html-safe", "syntax-highlighting"],
      "itemProperties": ["hints", "explanation"]
    },
    "tagDefinitions": {
      "Physics": {
        "wikidataId": "Q413"
      },
      "Rocket Engine": {
        "wikidataId": "Q335225",
        "description": "Engines based on reaction principle."
      }
    },
    "sourceMaterials": [
      {
        "id": "srcWikiRaptor",
        "type": "url",
        "title": "Wikipedia: Raptor (rocket engine)",
        "description": "Main article on English Wikipedia.",
        "value": "https://en.wikipedia.org/wiki/SpaceX_Raptor",
        "retrievedAt": "2025-11-14T08:00:00Z"
      }
    ],
    "appSpecific": {
      "memizy": {
        "folderId": "019cb89c-fbc7-73e6-be8c-dbebb9e6d797",
        "themeColor": "#FF5733",
        "isFavorite": true
      }
    }
  },
  "items": [
    {
      "id": "019aa608-07c5-71c9-87b2-d03ab3364668",
      "type": "flashcard",
      "tags": ["Rocket Engine"],
      "topic": "History of Spaceflight",
      "difficulty": 2,
      "assets": {
        "raptor": {
          "type": "image",
          "value": "https://example.com/raptor-engine.jpg",
          "altText": "Raptor Engine",
          "license": "CC-BY-SA-4.0",
          "attribution": "SpaceX"
        },
        "ignition_sound": {
          "type": "audio",
          "value": "https://example.com/ignition.mp3",
          "transcript": "Stage zero propellant loading complete. Three, two, one, ignition.",
          "loop": false,
          "subtitles": [
            {"lang": "en", "value": "https://example.com/ignition_en.vtt"}
          ]
        }
      },
      "front": "What is the name of the main engine of **Starship** spacecraft?\n\n<asset:raptor />\n\nListen to launch sequence: <asset:ignition_sound />",
      "back": "**Raptor** - methane rocket engine developed by SpaceX.",
      "sources": [
        {
          "id": "srcWikiRaptor",
          "location": "Introduction paragraph",
          "quote": "Raptor is a full-flow staged combustion, methane-fueled rocket engine."
        }
      ],
      "pedagogy": {
        "irtDiscrimination": 0.62,
        "irtGuessing": 0.33,
        "avgTime": 15
      },
      "appSpecific": {
        "memizy": {
          "isPinnedInEditor": true,
          "lastCursorPosition": 42,
          "aiGenerated": true
        }
      }
    },
    {
      "id": "019aa609-4dfd-7f42-9513-f6901129682f",
      "type": "mcq-single",
      "tags": ["Rocket Engine", "History"],
      "topic": "History of Spaceflight",
      "difficulty": 4,
      "timeLimit": 30,
      "question": "Which engine was used on the 1st stage of the **Saturn V** rocket?",
      "options": [
        "Raptor",
        "Merlin",
        "F-1"
      ],
      "correctIndex": 2,
      "shuffleOptions": true,
      "optionExplanations": [
        "Raptor powers Starship spacecraft, not Saturn V.",
        "Merlin is an engine for Falcon 9 and Falcon Heavy rockets.",
        null
      ],
      "explanation": "Five **F-1** engines powered the first stage of Saturn V. It remains the most powerful single-chamber liquid-fueled rocket engine ever developed."
    },
    {
      "id": "019aa609-8a22-7814-93fc-0df947ad8e3b",
      "type": "match-complex",
      "tags": ["Rocket Engine"],
      "difficulty": 3,
      "question": "Match countries with their main spaceports (some items are extra):",
      "leftItems": ["USA", "France", "Kazakhstan"],
      "rightItems": ["Cape Canaveral", "Kourou", "Baikonur", "Spaceport Cornwall"],
      "connections": [
        [0, 0],
        [1, 1],
        [2, 2]
      ]
    },
    {
      "id": "019aa609-d8c6-7c3f-adcb-9b87c375726e",
      "type": "pin-on-image",
      "tags": ["Rocket Engine"],
      "difficulty": 3,
      "assets": {
        "starship": {
          "type": "image",
          "value": "https://example.com/starship-diagram.jpg",
          "altText": "Starship spacecraft diagram",
          "license": "CC-BY-SA-4.0"
        }
      },
      "question": "Click on the location where Raptor engines are mounted on Starship spacecraft.",
      "targetAsset": "starship",
      "hotspots": [
        {
          "type": "circle",
          "x": 50,
          "y": 90,
          "radius": 5,
          "label": "Raptor Engines"
        }
      ]
    },
    {
      "id": "019aa60a-f1d4-7281-b5e2-4c2847a192fc",
      "type": "pin-on-model",
      "question": "Find and click on the **Femur** (thigh bone).",
      "assets": {
        "model_skeleton": {
          "type": "model",
          "value": "assets/models/skeleton.glb",
          "altText": "Human Skeleton"
        }
      },
      "targetAsset": "model_skeleton",
      "hotspots": [
        { "type": "mesh", "targetName": "Femur" }
      ],
      "camera": {
        "position": { "x": 0, "y": 1.5, "z": 2 },
        "target": { "x": 0, "y": 1.0, "z": 0 }
      }
    }
  ]
}
```

-----

## 9. Validation Rules and Constraints

To ensure consistency and practical implementability, the specification defines the following rules:

### 9.1. Length and Size Constraints

| Item | Maximum Value | Note |
| :--- | :--- | :--- |
| `meta.title` | 500 characters | For UI display |
| `meta.description` | 5,000 characters | Short set description (including Markdown) |
| `item.question` | 10,000 characters | Including Markdown formatting |
| `item.explanation` | 10,000 characters | Including Markdown formatting |
| `item.hints[]` (one hint) | 2,000 characters | Each hint separately |
| `options[]` (one option) | 2,000 characters | For MCQ and similar types |
| `items[]` (items array) | 10,000 items | Maximum count in one set |
| `options[]` (options array) | 100 options | For MCQ types |
| `prompts[]` / `matches[]` (match-pairs) | 100 items each | Both arrays must have equal length |
| `hints[]` (hints array) | 20 hints | Per one item |
| File in `assets/` (.oqse) | 25 MB | Host larger media externally (set fragmentation is not recommended and not supported, [see section 12.5](#125-performance)) |
| `customData` / `appSpecific` | 10 levels depth | Prevention of stack overflows |

**Note:** Applications SHOULD support at least these limits. If specific environment doesn't allow same or higher values, it MUST be documented and user must be warned before import.

### 9.2. Validation Rules for Indices and Arrays

- All indices (`correctIndex`, `correctIndices[]`) must be 0-based
- Indices must not be negative
- Indices must be within range of available options
- For `correctIndices[]`: must not contain duplicates

**For `ageMin` and `ageMax`:**
- `ageMin >= 0` (value 0 = preschool age, but recommended is >= 3)
- `ageMax >= 0`
- If both values are present, must hold: `ageMin <= ageMax`
- If `ageMin == ageMax == 0`, considered "unspecified" (same as omission)
- Recommended minimum range is 2 years (e.g., `ageMin: 6, ageMax: 8`)

**For `irtDifficulty` (in `pedagogy`):**
- Typical range: -3.0 to +3.0
- Application MUST accept any real number (no hard limit exists)
- Values outside range [-3.0, +3.0] SHOULD trigger warning (extreme difficulty)
- Values outside range [-5.0, +5.0] MAY be considered maximum or minimum value of allowed interval

**For `difficulty` (in section 4):**
- Must be in range 1-5 (integer)
- Values outside range are invalid
- Used for simple categorization; for advanced psychometric models use `pedagogy.irtDifficulty`

**For `optionExplanations` (in `mcq-single` and `mcq-multi`):**
- If present, length MUST be same as `options`
- Empty array `[]` is equivalent to field omission
- Missing explanation = `null` (not empty string `""`)
- Example:
  ```json
  "options": ["A", "B", "C"]
  "optionExplanations": ["Correct!", null, "Wrong"]  // Correct
  "optionExplanations": ["Correct!"]                  // Wrong (missing 2 elements)
  "optionExplanations": []                            // Correct (no explanations)
  ```

**For `timeLimit`:**
- Must be `> 0` or be omitted
- Recommended: `timeLimit >= 5` (less than 5 seconds is unrealistic)
- No max value (some tasks may take hours)

**For `minCorrect` (in `match-complex` and `pin-on-image`):**
- Must hold: `0 < minCorrect <= number_of_correct_answers`
- If `minCorrect` is missing, user must find all correct answers

**For `minSelections` and `maxSelections` (in `mcq-multi`):**
- Must hold: `0 < minSelections <= maxSelections <= options.length`
- If `minSelections` is missing, default value is 1
- If `maxSelections` is missing, default value is `options.length`

**For `slider`:**
- `correctAnswer` MUST lie in interval `<min, max>`.
- Value MUST be reachable: `(correctAnswer - min) % step === 0`. Otherwise Application MUST reject import.
- If `tolerance > 0`, it SHOULD also be a multiple of `step`, otherwise a warning about inconsistent evaluation is expected ([see section 6.12](#612-type-slider-slider--numeric-answer)).

**For `range` in `numeric-input`:**
- If `range` is present, `range.min < range.max` MUST hold. Application MUST reject import if `range.min >= range.max`.
- If `range` is present, `value` SHOULD lie within `<range.min, range.max>` (consistency recommendation).

**For `correctCells` in `matrix`:**
- If `multiplePerRow: false`, each row may have maximum one correct cell
- If `multiplePerRow: true`, rows can have multiple correct cells
- Invalid when `multiplePerRow: false` and `correctCells` contains multiple cells from same row

### 9.2a. Referential Integrity Validation

**References to other items:**
- `relatedItems`, `dependencyItems`: Application MUST ignore non-existent IDs with warning
- `sources[].id`: Application MUST ignore non-existent IDs with warning ([see section 7.7](#77-sourcereference-for-itemsources))
- `meta.translations[].id`, `meta.prerequisites[].id`, `meta.relatedSets[].id`: External references, cannot validate locally

**References to assets:**
- `<asset:key />` in Rich Content: Application MUST display placeholder and warning (recoverable error)
- `thumbnail`, `targetAsset`: Application MUST declare error if asset doesn't exist (critical property)

**Field synchronization:**
- `optionExplanations` vs `options`: Lengths MUST be same OR `optionExplanations` is empty/omitted
- `blanks` tokens vs `text` tokens: Must match exactly ([see section 6.7](#67-type-fill-in-blanks-fill-in-the-blanks))

### 9.3. UUID Validation Rules

The standard for OQSE v0.1 is **UUIDv7**. For applications simplification, it is recommended to support only **UUIDv7** (preferred) and **UUIDv4** (fallback).

**Rules for Applications:**
1. **Import:** Application MUST accept UUID versions 4 and 7 when loading existing sets. Application MAY accept other versions (1-6), but this is not required.
2. **Export of new items:** Application MUST generate new items with UUIDv7 to ensure chronological ordering and optimal indexing in databases.
3. **Re-export:** Existing UUID MUST be preserved unchanged regardless of version (due to referential integrity).
4. **Validation:** Application checks only syntactic UUID format (8-4-4-4-12 hex characters), not specific version.
5. **Uniqueness:** All UUIDs in file MUST be globally unique.

**Exception:** `SourceMaterial.id` MAY be alphanumeric string unique only within that file, and `id` within internal item objects such as `TimelineEvent` or `CategorizeItem` MAY also be alphanumeric string.

### 9.4. URI and Path Security Validation Rules

- All fields marked as URI for remote resources (e.g., `licenseUrl`, `SourceMaterial.value` with types `url|pdf|video|audio|image`, `MediaObject.value` referencing external media) MUST use absolute URI including protocol. `https://` is recommended, `http://` is acceptable only with warning to user.

- **Security rules for URI schemes:**
  * Application MUST reject URI schemes: `javascript:`, `data:`, `vbscript:`, `file:`
  * Allowed schemes: `https:`, `http:` (with warning)

- **Local Media Path Validation (Local Assets):**
  If string in `MediaObject.value` doesn't start with specified network protocol (e.g., `https://`, `http://`), application MUST consider it relative path to file inside `.oqse` package. For these paths, strict security rules (Sanitization) apply:

  1. **No absolute paths:** Path MUST NOT start with slash `/`, backslash `\`, or drive letter identifier (e.g., `C:`, `D:`). Application MUST immediately reject such values as invalid to prevent access to host filesystem (e.g., `/etc/passwd`, `C:\Windows\win.ini`).
  2. **No Path Traversal:** Path MUST NOT contain sequences for moving to parent directory (`..`, `../`, `..\`).
  3. **Whitelist of allowed characters:** Relative path MUST contain only alphanumeric characters (`a-z`, `A-Z`, `0-9`), underscores (`_`), hyphens (`-`), periods (`.`), and forward slashes (`/`) as directory separators. Any other character (including spaces) leads to path rejection or strict URL encoding.
  4. **File extensions:** Files in `assets/` folder **SHOULD** have extension matching their content (e.g., `.jpg`, `.mp3`). If JSON contains reference `"value": "assets/image_no_extension"`, browsers and applications may have trouble determining `Content-Type` and properly rendering file.
  5. **Case Sensitivity:** Application MUST perform case-insensitive path comparison (due to differences between Windows/Linux/macOS). On export, editor MUST convert all filenames to lowercase for consistency.

- **Valid examples:**
  * `assets/img/diagram_01.png` (Valid)
  * `/User/data/img.png` (Invalid - absolute path)
  * `../../system/config` (Invalid - path traversal)
  * `assets/image (1).jpg` (Invalid - contains space and parentheses, must rename or encode)

- **Media Tag:** Tag `<asset:key />` is internal reference and MUST NOT be considered URL. Application always evaluates key in order `item.assets` → `meta.assets`.

**Asset key rules:**
- Keys in `assets` (JSON) MUST consist only of lowercase letters, digits, underscores, and hyphens (regex: `^[a-z0-9_-]+$`).
- Keys MUST NOT contain spaces or forbidden special characters. The Application MUST reject keys containing such invalid characters.
- If a key contains uppercase letters (`A-Z`), the Application MUST NOT immediately reject it during import or render. Instead, it MUST automatically normalize the key to lowercase and handle any resulting collisions as defined in the global Case Sensitivity rules ([see section 1.](#1-global-rules-and-root-structure)).

### 9.5. Date and Time Validation Rules
To ensure maximum application compatibility and correct chronological ordering, specification **restricts** allowed formats to subset of ISO 8601 norm corresponding to **RFC 3339** (Internet Date/Time Format).

* **Required format:** Must use so-called **Extended Format** (with separators `-` and `:`).
    * Date: `YYYY-MM-DD` (e.g., `2025-11-21`)
    * Date and time: `YYYY-MM-DDTHH:MM:SS` plus time zone (e.g., `2025-11-21T14:30:00Z` or `2025-11-21T15:30:00+01:00`).
* **Forbidden formats:**
    * Basic format without separators (e.g., `20251121` is **INVALID**).
    * Week dates (e.g., `2025-W47` is **INVALID**).
    * Ordinal dates (e.g., `2025-325` is **INVALID**).
    * Slashes as separators (e.g., `2025/11/21` is **INVALID**).
* **Time zones:**
    * For machine times (`createdAt`, `updatedAt`), it is **RECOMMENDED** to use exclusively UTC marked with suffix `Z`.
    * Applications **MUST** also support numeric offsets (e.g., `+01:00`).
* **Historical dates (negative years):**
    * For years before Common Era (BC), use minus sign and year padded to 4 digits (e.g., Battle of Thermopylae: `-0480-08-01`).
    * Year 0 in this format corresponds to 1 BC (astronomical numbering). Application SHOULD account for this when displaying to user.

### 9.6. Security Rules for OQSE Container (ZIP)

Applications processing `.oqse` packages (ZIP) MUST implement following protections against filesystem and availability attacks:

**Protection against "Zip Slip":** Application MUST verify canonical path of each file during unpacking. Target path of unpacked file MUST start with root directory designated for extraction. If file contains sequences `../` or absolute paths that would lead to writing outside this directory, application MUST immediately abort extraction and declare error.

**Ban on Symbolic Links (Symlinks):** Application MUST NOT follow or create symbolic links (symlinks) or hard links contained in archive. If archive contains such items, application MUST ignore them or declare error.

**"ZIP Bomb" Prevention:** Application MUST check compression ratio and total size of unpacked data.
  * **Recommended:** Abort extraction if total size of unpacked data exceeds 10x archive size or fixed limit (e.g., 250 MB, considering 25 MB limit for assets).
  * Application MUST reject files with extremely high compression ratio that could cause memory exhaustion (DoS).

**File count limit:** Application SHOULD limit maximum number of files extracted from one archive (e.g., to 10,000) to prevent flooding inode table of filesystem.

### 9.7. Prohibited Values and Duplication

**Empty/whitespace strings:**
- `meta.title`, `meta.language`, `item.type` MUST NOT be empty or contain only whitespace
- Application MUST declare error when detecting empty required fields

**Duplicate values:**
- Field `options` in MCQ types MUST NOT contain duplicate strings (case-insensitive comparison)
- Field `categories` in `categorize` MUST NOT contain duplicate names
- All `id` values of top-level `items` MUST be unique within the set. `id` values in `TimelineEvent` and `CategorizeItem` MUST be unique within their parent item (not globally).

**Invalid references:**
- Plain Text fields MUST NOT contain Media Tags `<asset:...>` (only in Rich Content)
- Rich Content fields MAY contain Media Tags; HTML tags are sanitized

### 9.8. Shuffling Rules

- Shuffling is performed on each new attempt, not per-session
- Original order from JSON is "correct order" and MUST be preserved in application logic
- For `mcq-single/multi`: If `shuffleOptions: false`, options display in order from `options` array
- For `sort-items`: Items are always shuffled (otherwise task would be meaningless)
- For `timeline`: Respect `randomize` flag (default: `true`)
- For `match-pairs`: Application MUST shuffle both sides before display

### 9.9. Rules for `lang` Override

- `item.lang` overrides `meta.language` only for this item
- Application SHOULD use correct font and text direction (RTL for `ar`, `he`)
- In fulltext search, application SHOULD use correct tokenizer for language
- `item.lang` DOES NOT affect application UI language, only item content

### 9.10. Clarification of `customData` vs `appSpecific`

**`customData`:**
- For metadata from **set creator** (teacher, author)
- Portable between applications (e.g., "school class", "topic of week")
- Example: `{"schoolGrade": "9A", "topicId": "physics-101"}`

**`appSpecific`:**
- For metadata from **application** (editor, player)
- Not portable, other applications MUST ignore
- Top-level keys MUST be the application identifier (namespacing requirement)
- Example: `{"memizy": {"editorState": {...}, "lastPosition": 42}}`

**Constraints:**
- Maximum depth: 10 nesting levels (stack overflow prevention)
- Recommended maximum size: 50 KB serialized JSON
- MUST NOT contain sensitive data (passwords, tokens)

### 9.11. Key Order for Optimization (Streaming)

Although JSON standard doesn't require key order, for memory efficiency optimization when parsing large sets (High Performance Parsing), OQSE file generators MUST write root object in this order:

1. **Identifiers** (`$schema`, `version`)
2. **Metadata** (`meta`)
3. **Data** (`items`)

This order ensures that:
- Application can validate version and schema before loading data
- Metadata are available for UI (progress bar, set name) before parsing items
- Large `items` array is loaded last, enabling streaming parsing
- Format is "future-proof" for pagination implementation without breaking changes

**Example of correct order:**
```json
{
  "$schema": "https://memizy.com/schemas/oqse/v0.1.json",
  "version": "0.1",
  "meta": { ... },
  "items": [ ... ]
}
```

### 9.12. Manifest Validation Rules

This section is the single reference for all constraints on Application Manifest fields. For the normative definition of each field and its behavioral semantics, see [§2.1 – The Application Manifest](#21-the-application-manifest). A host environment MUST reject a manifest that violates any MUST rule below and MUST report an appropriate structured error to the user.

#### 9.12.1. Required Fields

- `version`, `id`, `appName`, and `capabilities` MUST be present. A manifest missing any of these MUST be rejected.
- `capabilities.actions` MUST be present and non-empty. A manifest with no declared actions is inoperable.

#### 9.12.2. Root Field Constraints

**`version`, `minOqseVersion`, `maxOqseVersion`:**
- MUST match the pattern `^\d+\.\d+$` (e.g., `"1.0"`, `"1.99"`, `"2.0"`). Both components MUST be non-negative integers.
- Version comparison is performed numerically field-by-field: `"1.10"` is greater than `"1.9"`.
- A malformed `version` value MUST cause manifest rejection (it is a required field). A malformed `minOqseVersion` or `maxOqseVersion` SHOULD be treated as absent; the host SHOULD warn.
- If both `minOqseVersion` and `maxOqseVersion` are present, `minOqseVersion` MUST be less than or equal to `maxOqseVersion`. A manifest violating this MUST be rejected.

**`pluginVersion`:**
- SHOULD follow SemVer format `MAJOR.MINOR.PATCH` (e.g., `"2.1.0"`).
- Applications MUST NOT reject a manifest solely because `pluginVersion` does not follow SemVer.

**`id`:**
- MUST be either a controlled absolute URL (e.g., `"https://memizy.com/player"`) or a URN-format UUID (e.g., `"urn:uuid:019aa600-abc1-7234-b678-c0ffee000001"`).
- A value that is neither a valid absolute URL nor a valid URN UUID SHOULD trigger a warning.

**`appName`:**
- MUST NOT be empty or contain only whitespace.

**`studyMode`:**
- MUST be one of: `"game"`, `"fun"`, `"drill"`.
- An unrecognized value SHOULD be treated as absent; the host SHOULD warn.

**`questionDensity`:**
- MUST be one of: `"low"`, `"medium"`, `"high"`.
- An unrecognized value SHOULD be treated as absent; the host SHOULD warn.
- If `studyMode` is `"drill"` and `questionDensity` is anything other than `"high"`, hosts SHOULD emit an inconsistency warning (the host treats it as `"high"` per [§2.1.1](#211-manifest-root-object)).

**`emoji`:**
- SHOULD contain a single visually-rendered emoji glyph.
- An empty string or a value containing no recognizable emoji SHOULD trigger a warning.
- Hosts MUST NOT reject a manifest solely due to a multi-codepoint emoji sequence (flags, ZWJ family sequences, etc.).

**`locales`:**
- Each entry MUST be a valid BCP 47 language tag (e.g., `"en"`, `"cs"`, `"zh-Hans"`).
- `[]` MUST be treated identically to key omission; the host SHOULD assume English in both cases.

#### 9.12.3. Capabilities Validation

For the full semantics of the capabilities object, see [§2.1.2 – Capabilities Object](#212-capabilities-object-extends-featureprofile) and [Wildcard and Null Semantics](#wildcard-and-null-semantics).

**`capabilities.actions`:**
- MUST contain at least one value from the [Action Registry (§2.1.3)](#213-action-registry).
- Values that are not in the Action Registry and do not carry an `x-` prefix SHOULD trigger a warning; a host MAY reject the manifest.
- If `render` or `edit` is declared in `actions`, then `types` MUST also be declared and non-null (see below).

**`capabilities.types`:**
- If `render` or `edit` is in `actions`, at least one type or `["*"]` MUST be declared; a null or empty result makes the manifest inoperable for its declared purpose and MUST be reported as an error.
- `[]` MUST be treated identically to `null` per [Wildcard and Null Semantics](#wildcard-and-null-semantics).
- `["*"]` is valid and declares support for all item types.
- Custom type values not among the official item types defined in [§6](#6-item-types-itemtype) MUST use the `x-` prefix per [§11.1](#111-adding-custom-item-types).

**`capabilities.assets`:**
- Each asset category key (`image`, `audio`, `video`, `model`) follows the [Wildcard and Null Semantics](#wildcard-and-null-semantics): `["*"]`, an explicit MIME type list, `null`, or `[]` (equivalent to `null`).
- MIME type strings SHOULD conform to IANA media type format (e.g., `"image/webp"`, `"audio/mpeg"`).
- An unrecognized MIME type SHOULD trigger a warning but MUST NOT cause manifest rejection.

**`capabilities.features`:**
- Each value MUST either appear in the [Official Feature Registry (§2.2)](#official-feature-registry) or carry the `x-` prefix per [Extension Rules (§2.2)](#extension-rules).
- A value without an `x-` prefix that is not in the registry is invalid; the host SHOULD warn and MAY reject the manifest.
- The features `syntax-highlighting`, `mermaid`, `smiles`, and `abc-notation` are only meaningful when `markdown` is also declared (they operate on GFM fenced code blocks). Declaring any of these without `markdown` SHOULD trigger a warning.
- `html-safe` is only meaningful when `markdown` is also declared, since raw HTML in Rich Content fields is only parsed and rendered as part of the GFM pipeline. Declaring `html-safe` without `markdown` SHOULD trigger a warning.

**`capabilities.latexPackages`:**
- Only meaningful when `"math"` is present in `capabilities.features`. Declaring `latexPackages` without `"math"` SHOULD trigger a warning.

**`capabilities.itemProperties` / `capabilities.metaProperties`:**
- Each value SHOULD appear in the [Registry of Properties (§2.2)](#registry-of-properties-itemproperties--metaproperties) or carry the `x-` prefix.
- Unrecognized values without an `x-` prefix SHOULD trigger a warning but MUST NOT cause manifest rejection.

-----

## 10. Error Handling (Error Handling Policy)

Application implementation MUST follow **"Best Effort"** strategy.

### 10.1. Atomic Validation

The validation unit is one item in the `items` array. A validation error within one item (e.g., missing required field, unknown type, invalid index value) is considered a local error.

### 10.2. Error Recovery

When local error occurs, Application:

1. **MUST** ignore that item (not load into memory).
2. **MUST NOT** interrupt parsing of rest of file (if JSON is syntactically valid).
3. **MUST** record this event in internal error log.

### 10.3. Reporting

Application performing import **SHOULD** inform user about operation result, especially if some items were skipped (e.g., "Imported 48 of 50 items, 2 skipped due to errors").

### 10.4. Error Handling and Fallback Strategies

To ensure consistent behavior across implementations, specification defines following error handling rules:

### 10.4.1. Critical Errors (Application MUST abort loading)

1. **Invalid JSON syntax:** Immediate failure with error message about error position.
2. **Missing required field in `meta`:** Error with list of all missing fields (`id`, `title`, `language`, `createdAt`, `updatedAt`).
3. **Invalid `version` value:** If version is not supported or missing.

### 10.4.2. Recoverable Errors (Application continues with warning)

1. **Unknown `item.type`:** 
   - Application MUST skip item
   - Record warning with `item.id` and unknown type
   - Continue processing other items

2. **Missing asset reference:** 
   - When `<asset:key />` references non-existent media
   - Application MUST display placeholder or text replacement
   - Record warning with path to missing asset

3. **Invalid UUID format:**
   - Application MUST reject item (cannot guarantee uniqueness)
   - Application MAY offer automatic UUID regeneration with UUIDv7

4. **Non-existent ID in `relatedItems` or `dependencyItems`:**
   - Application MUST ignore invalid reference
   - Record warning with item ID and non-existent reference

5. **Exceeding limits (section 9.1):**
   - **Soft limit:** Warning on import, data preserved
   - **Hard limit:** Offer trimming or rejection

6. **Empty `items` array:**
   - The set may be a template or work-in-progress
   - Application MUST load the set successfully and display an appropriate empty-state message
   - Record warning (e.g., "Set loaded with 0 items")

### 10.4.3. Fallback Strategies

**For unknown fields:**
- Application MUST ignore unknown keys (forward compatibility)
- On re-export, unknown data MUST be preserved unchanged

**For incomplete data:**
- Missing optional fields: use default values per specification
- Missing `altText` for image: generate from filename or use placeholder

**For versions:**
- Higher MAJOR version: display warning and offer to continue in "best effort" mode
- Higher MINOR version: safely ignore new keys

### 10.4.4. Structured Error Log

Application SHOULD provide structured log of errors and warnings:

```json
{
  "errors": [
    {
      "severity": "error",
      "code": "MISSING_REQUIRED_FIELD",
      "message": "Missing required field 'meta.id'",
      "path": "meta.id"
    }
  ],
  "warnings": [
    {
      "severity": "warning",
      "code": "UNKNOWN_ITEM_TYPE",
      "message": "Unknown item type 'x-custom-quiz'",
      "path": "items[5].type",
      "itemId": "019aa7f8-bdf4-7093-b7e1-37730c3e48fb"
    }
  ]
}
```

-----

## 11. Extensibility and Versioning

### 11.1. Adding Custom Item Types

Applications may define custom item types using `x-` prefix (e.g., `x-code-challenge`, `x-pronunciation`). These types:
  * MUST preserve all common properties from section 4
  * SHOULD be documented in `appSpecific` object in `meta`
  * MUST NOT collide with future official types

### 11.2. Versioning and Compatibility

**Semantic Versioning:** OQSE uses format `MAJOR.MINOR` (e.g., `1.0`, `2.0`, `2.1`).

  * **MAJOR change:** Fundamental breaking changes (e.g., change of required fields, type removal).
  * **MINOR change:** Addition of new optional fields or types (backward compatible).

**Rules for applications:**
  * Application MUST ignore unknown keys (forward compatibility)
  * Application MUST check the `version` field and apply version-specific handling; the value MUST conform to `MAJOR.MINOR` format (see [§9.12](#912-manifest-validation-rules) for format rules applied equally to OQSE file version and all manifest version fields)
  * When importing higher MAJOR version: display warning to user
  * When importing higher MINOR version: safely ignore new keys

-----

## 12. Best Practices for Set Creators

### 12.1. Accessibility
  * Always fill `altText` for images in `assets`
  * For each audio/video asset, provide `transcript` or subtitles in at least one language, so content remains accessible to users with hearing impairments
  * Use clear and unambiguous language
  * Test with screen readers

### 12.2. Optimization for AI Generation
  * **Prefer simple structures**: AI models work better with flat arrays (`string[]`, `number[]`) than deep nesting. Conversion to JSON is then deterministic.
  * **Centralize media**: Define all media in `assets` (at item or `meta` level). Content should contain only text and Media Tags, never direct URLs.
  * **Use Media Tags**: Reference media exclusively using `<asset:key />`. AI prompt can explicitly request this format: "Add image as `<asset:diagram1 />`".
  * **Reusability without duplication**: Place shared resources in `meta.assets` and reference from multiple items using same key. AI thus doesn't have to repeatedly generate identical `MediaObject`.
  * **Prompt minimally**: "Create 5 questions with options A, B, C, D" → AI returns `options: ["A...", "B...", "C...", "D..."]`. Fewer descriptive words, more consistent structures.
  * **Prepare asset dictionary**: If AI generates references to `<asset:img1 />`, pre-fill `assets` and let AI just add descriptions (`altText`, `caption`).

### 12.3. Localization
  * Main set in one language (`meta.language`)
  * For translations create separate OQSE files with different `id` and reference in `meta.translations` (TranslationObject)
  * Use Unicode normalization (NFC) for consistency

### 12.4. Security
  * **HTML Sanitization:** GitHub Flavored Markdown (GFM) allows HTML, which is important for formatting that pure Markdown cannot handle (e.g., text colors, highlighting, or typographic subscripts outside math mode). GFM is superset of CommonMark. Specification: [https://github.github.com/gfm/](https://github.github.com/gfm/)
    * Application **MUST** perform strict sanitization of resulting HTML (e.g., using library like DOMPurify).
    * **ALLOWED** tags: Safe formatting tags (e.g., `b`, `i`, `strong`, `em`, `sub`, `sup`, `span`, `br`, `ruby`, `rt`, `rp`).
    * **FORBIDDEN** tags: All active or dangerous elements (e.g., `script`, `iframe`, `object`, `embed`, `form`, `style` and event handlers like `onclick`).
  * **Asset Sanitization:** The only HTML that gets into DOM is result of replacing `<asset:... />` tags. Application MUST ensure that attributes of generated elements (e.g., `src`, `alt`) are safe and don't contain injected code.
  * **NEVER** insert sensitive information (passwords, API keys)
  * When using external URLs, validate HTTPS
  * Validate media checksums before use ([see section 5](#5-the-mediaobject-object))

### 12.5. Performance
  * Host very large media externally (e.g., CDN) to keep `.oqse` packages small
  * For video longer than 1 minute, use external hosting (YouTube, Vimeo)
  * Compress JSON before distribution (gzip)

### 12.6. Metadata for Search
  * Always fill `description`, `tags`, and `subject`
  * Use `tagDefinitions` with Wikidata ID for better discoverability
  * Keep `sourceMaterials` current

-----

## 13. Validation and Tools

### 13.1. JSON Schema
Official JSON Schema is available at:

[https://memizy.com/schemas/oqse/v0.1.json](https://memizy.com/schemas/oqse/v0.1.json)

### 13.2. Recommended Tools
  * **Validators:** Ajv, JSON Schema Validator
  * **Editing:** VS Code with JSON Schema support
  * **Conversion:** Planned CLI tools for import from Quizlet, Anki, etc.

### 13.3. Test Suite
Reference test files including all item types are available at:

[https://github.com/memizy/oqse-test-suite](https://github.com/memizy/oqse-test-suite)

### 13.4. Common Pitfalls

#### **Error: Embedding HTML/Markdown media instead of Media Tag**
```json
"question": "Look at the image: <img src=\"https://example.com/img.png\" alt=\"Engine\">"
```
**Correct:**
```json
"assets": {
  "img_engine": {
    "type": "image",
    "value": "https://example.com/img.png",
    "altText": "Raptor Engine"
  }
},
"question": "Look at the image: <asset:img_engine />"
```

#### **Error: Reference to undefined `asset` key**
```json
"question": "Where is Prague? <asset:europe_map />"
```
No `europe_map` is defined in `item.assets` nor `meta.assets`.

**Correct:**
```json
"assets": {
  "europe_map": {
    "type": "image",
    "value": "https://example.com/map.png",
    "altText": "Political map of Europe"
  }
},
"question": "Where is Prague? <asset:europe_map />"
```

#### **Error: Missing `altText` for images**
```json
"assets": {
  "img1": {
    "type": "image",
    "value": "https://example.com/image.jpg"
  }
}
```
**Correct:**
```json
"assets": {
  "img1": {
    "type": "image",
    "value": "https://example.com/image.jpg",
    "altText": "Image description for screen readers"
  }
}
```

#### **Error: Indices out of range**
```json
{
  "type": "mcq-single",
  "options": ["A", "B", "C"],
  "correctIndex": 3
}
```
**Correct:** `correctIndex: 2` (0-based, max index is 2)

#### **Error: Incorrect `correctCells` format (using object instead of coordinates array)**
```json
"correctCells": {
  "row_0_col_1": true
}
```
**Correct:** (Array of arrays `[row, column]`)
```json
"correctCells": [
  [0, 1]
]
```

#### **Error: Using GPS coordinates instead of percentages in hotspots**
```json
{
  "type": "circle",
  "x": 50.0875,
  "y": 14.4213,
  "radius": 2
}
```
**Correct:** Coordinates must be in percentages (0.0-100.0):
```json
{
  "type": "circle",
  "x": 50,
  "y": 50,
  "radius": 5
}
```

#### **Error: Invalid UUID**
```json
"id": "abc-123"
```
**Correct:** (UUIDv7 example)
```json
"id": "019aa7f8-bdf4-7093-b7e1-37730c3e48fb"
```

#### **Error: Duplicate indices in `correctIndices`**
```json
"correctIndices": [0, 2, 2, 4]
```
**Correct:**
```json
"correctIndices": [0, 2, 4]
```

-----

## 14. Contributing and Community

OQSE is an open standard. Suggestions for improvements:
  * GitHub: [https://github.com/memizy/oqse-spec](https://github.com/memizy/oqse-spec)
  * Discussions: GitHub Discussions
  * Email: `oqse@memizy.com`

**Change acceptance process:**
1. Open issue with proposal
2. Community discussion (min. 2 weeks)
3. Pull request with specification update
4. Review by maintainers
5. Merge and version update

-----

**Document Version:** 0.1  
**Last Updated:** November 20, 2025  
**Documentation License:** CC-BY-SA-4.0

-----

### Version 0.1 (November 20, 2025)
#### First version of this specification created

