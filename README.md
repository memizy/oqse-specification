<div align="center">

# 📜 OQSE Specification
**Open Question Set Exchange Format**

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

Traditional flashcard formats (like `.apkg` from Anki) are often rigid, focusing solely on isolated Question/Answer pairs. 

**OQSE** is built differently. It is designed for heavy university-level studying (Medicine, Mathematics, Law) and introduces the concept of **Contextual Learning**. It supports not just standard flashcards, but continuous readable **Notes** integrated with a "Traffic Light" Spaced Repetition system.

### Key Capabilities
* 📖 **Continuous Context:** Mix standard flashcards with readable paragraphs of text.
* 🚦 **Self-Assessed Notes:** Use `hidden content` and self-reflection (Red/Yellow/Green) directly on reading blocks.
* 🧩 **Extensible:** Native support for rendering Markdown, LaTeX (Math), and embedding custom HTML/JS Plugins.
* 🌍 **Portable & Local-First:** Plain JSON files that can be easily parsed, shared via CDN, and stored locally in OPFS/IndexedDB.

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
    "tags": ["Computer Science", "Data Formats"],
    "estimatedTime": 120
  },
  "items": [
    {
      "id": "019aa702-0001-789a-bcde-f01234567801",
      "type": "note",
      "tags": ["Data Modeling", "Concepts"],
      "text": "### Data Modeling Levels\nWhen designing data structures, we distinguish between three levels:\n* **Conceptual:** What is the data about?\n* **Logical:** How is the data structured using given technology/format?\n* **Physical:** How do the files look like in storage?",
      "hidden_content": "Rule of thumb: Conceptual is format-agnostic, Logical depends on the paradigm, Physical depends on the storage engine.",
      "allow_traffic_light": true
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
