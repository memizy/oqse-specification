
## 2. Capability-Based Interoperability, Application Manifest & Progress Data

OQSE v0.1 uses a **capability-based negotiation system**. Every application, micro-frontend, or plugin MUST declare exactly what it can do using an **OQSEM**. Interoperability is achieved by matching the **Requirements** of a study set with the **Capabilities** of the application.

### 2.1. OQSEM (Application Manifest)

Applications MUST declare their capabilities in a standardized JSON format, known as **OQSEM** (Open Quiz & Study Exchange Manifest). This allows host environments to automatically determine if an application or plugin can safely process a given study set.

**Delivery:** Applications delivered via HTML SHOULD embed their manifest using a `<script type="application/oqse-manifest+json">` tag. This pattern is known as an **HTML Data Island**: the browser ignores the script block entirely (it does not execute it), but the host environment can locate and parse it cheaply via a DOM query (`document.querySelector('script[type="application/oqse-manifest+json"]')`), without requiring a separate network request. Applications that are not HTML-based (e.g., server-side importers, CLI tools) SHOULD expose their manifest as a static `oqse-manifest.json` file at the root of their deployment, allowing host environments to fetch it without rendering the application. When served over HTTP, this file SHOULD be delivered with the standard `Content-Type: application/json` MIME type; this avoids the need for developers to configure custom MIME types on their static file servers. Host environments MAY also support manifest discovery via an HTTP `Link` response header: `Link: <oqse-manifest.json>; rel="oqse-manifest"`.

**OQSEM Structure Example:**

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

#### 2.1.1 OQSEM Root Object

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `$schema` | string | No | **Recommended.** URL reference to the JSON Schema specification for automatic validation. |
| `version` | string | Yes | Version of the OQSEM format. MUST follow `"MAJOR.MINOR"` format (e.g., `"1.0"`). The current OQSEM format version is `"1.0"`. |
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
