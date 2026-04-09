<div align="center">

# 📜 OQSE Specification
**Open Quiz and Study Exchange Format**

![Version](https://img.shields.io/badge/Version-0.1.0--draft-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Ecosystem](https://img.shields.io/badge/Memizy-Core_Standard-success?style=for-the-badge)

<br>

**OQSE** is an open, JSON-based data format designed for modern educational platforms. It is the core data structure powering the [Memizy Ecosystem](https://github.com/memizy/memizy).

</div>

> [!WARNING]  
> **Work in Progress (WIP) / Unstable API**
> This specification is currently in **active development** and has not reached a stable release yet. Fields, schemas, and API methods are subject to change, rename, or removal at any time without a version bump. Use in production at your own risk.

---

## 💡 What is OQSE?

**OQSE** is built with a focus on **Data-View Separation**. Unlike legacy formats that bake styling directly into the data, OQSE treates educational content as structured, semantic objects. This approach ensures maximum readability, easy JSON-based editing, and a predictable rendering pipeline for developers.

* **🏗️ Semantic Structure:** Clear separation between metadata, global assets, and study items.
* **🖼️ Unified Asset Pipeline:** Media (Images, Audio, Video, 3D models) is decoupled from text using a unique `<asset:key />` syntax, preventing Markdown/HTML collisions.
* **🧬 Rich Content support:** Native support for GFM (GitHub Flavored Markdown) and LaTeX, processed through a standardized 4-step rendering pipeline (Tokenize → Render → Sanitize → Detokenize).
* **🌍 Portable & Local-First:** Plain JSON files designed for easy versioning in Git, distribution via CDN, and high-performance local storage (OPFS/IndexedDB).

---

## 🏗️ Structure Overview

An `.oqse.json` file consists of two main parts: `meta` (information about the set) and `items` (the actual study items).

### Basic Example

Here is a real-world snippet of an `.oqse.json` file. Notice how it seamlessly mixes traditional flashcards, readable self-assessed study notes, and multiple-choice questions.

```json
{
  "$schema": "https://raw.githubusercontent.com/memizy/oqse-specification/main/schemas/v0.json",
  "version": "0.1",
  "meta": {
    "id": "019aa702-5566-7788-9900-aabbccddeeff",
    "title": "Data Formats & Multimedia",
    "language": "en",
    "subject": "Computer Science",
    "description": "A comprehensive study set covering the full spectrum of data handling.",
    "assets": {
      "format_icon": {
        "type": "image",
        "value": "https://cdn.example.com/icons/json.png",
        "altText": "JSON Logo"
      }
    }
  },
  "items": [
    {
      "id": "019aa702-0001-789a-bcde-f01234567801",
      "type": "note",
      "tags": ["Data Modeling", "Concepts"],
      "title": "Data Modeling Levels",
      "content": "When designing data structures, we distinguish between three levels:\n* **Conceptual:** What is the data about?\n* **Logical:** How is the data structured?\n* **Physical:** How do the files look like? <asset:format_icon />",
      "hiddenContent": "Note: Conceptual is format-agnostic, Logical depends on the paradigm, Physical depends on the storage engine."
    },
    {
      "id": "019aa702-0004-789a-bcde-f01234567804",
      "type": "flashcard",
      "tags": ["Data Formats", "Physical"],
      "front": "What are **Data Formats**?",
      "back": "The physical view of data (how data is serialized into files).\n\nExamples: **RDF**, **XML**, **JSON**."
    },
    {
      "id": "019aa702-0007-789a-bcde-f01234567807",
      "type": "mcq-multi",
      "tags": ["Data Formats", "Serialization"],
      "question": "Which of the following are examples of **physical data formats**?",
      "options": [
        "JSON",
        "Conceptual Model",
        "XML",
        "Entity-Relationship Diagram",
        "RDF"
      ],
      "correctIndices": [0, 2, 4],
      "minSelections": 1,
      "shuffleOptions": true,
      "explanation": "JSON, XML, and RDF are physical serialization formats. Conceptual models and ERDs belong to the abstract design phases."
    }
  ]
}
```

---

## 🏗️ Architecture & Single Source of Truth

This repository serves not only as the textual specification but also as the official NPM package providing types and validators. To maintain 100% synchronization between types, code, and JSON schemas, we use the following approach:

1. **Human Source of Truth (`SPECIFICATION.md`):** This document contains all the rules, guidelines, and semantics of the OQSE format.
2. **Code Source of Truth (`src/*Validation.ts`):** All validation logic is written using **Zod**. These Zod schemas act as the absolute source of truth for the codebase.
3. **Derived Artifacts (Types and JSON Schemas):**
   * TypeScript types (`src/oqse.ts` and `src/manifest.ts`) manually mirror the Zod schemas to ensure maximum readability and a great developer experience.
   * **JSON schemas (`schemas/*.json`) are generated automatically!**

> ⚠️ **CONTRIBUTOR WARNING: Do not edit the files in `schemas/*.json` manually!**
> 
> If you need to add a new field, modify an existing one, or change a validation rule, update the respective Zod schema in the `src/` folder and then run:
> 
> ```bash
> npm run generate:schemas
> ```
> 
> This command will automatically regenerate and overwrite the JSON schemas to perfectly match the updated code.

---

## 📚 Documentation

Detailed documentation on how to construct OQSE files and integrate them into your apps can be found in the folders below:

* **`/schemas`** - JSON Schemas for validation.
* **`/types`** - TypeScript interface definitions (`.d.ts`).
* **`/docs`** - Comprehensive guides on formatting, LaTeX usage, and asset linking (via CDN).

---

## 🤝 Contributing

We welcome community feedback! If you have ideas for new item types (like Multiple Choice, Cloze Deletion, etc.), please open an Issue or a Pull Request in this repository.

For general app-related issues, please visit the [Main Memizy Hub](https://www.google.com/url?sa=E&source=gmail&q=https://github.com/memizy/memizy).

<div align="center">
<i>Maintained with ❤️ by the Memizy Team.</i>
</div>
