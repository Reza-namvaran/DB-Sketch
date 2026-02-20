# DB-Sketch 

A lightweight, **offline-first ER / EER diagram editor** built with **plain HTML, CSS, JavaScript, and SVG** — no frameworks, no external dependencies, no internet required.

This tool is designed as a database modeling app, with support for **ER and Extended ER (EER)** concepts, syntax-based diagram generation, and precise mouse-based editing.

---
## In Memory of Those We Lost

This project was created during the January 2026 internet blackout in Iran — one of the darkest and most uncertain periods in recent years.

During those weeks, amid deep economic hardship and nationwide protests, millions of people experienced a sudden and prolonged disconnection from the world. Beginning on January 8, 2026, internet and mobile networks were shut down across the country for nearly twenty days — and longer in some regions. Families were separated not by distance, but by silence. Messages went undelivered. Voices went unheard. Worry grew heavier with each passing day.

In that silence, in that uncertainty, this project was built.

It stands as a small testament to resilience — created in days when connection was taken away, yet hope endured.

This work is dedicated with humility and love to:
- Those who are no longer with us
- The families who carry the enduring weight of loss
- All who lived through those difficult days and continue to hold onto hope

May their memory remain alive in our hearts and in our work.

**.یادشان همیشه گرامی**

.به امید روز های روشن برای ایران زمین

---

## ✨ Features

### Diagram Elements
- **Entities** (rectangle)
- **Weak Entities** (double rectangle)
- **Relationships** (diamond)
- **Identifying Relationships**
- **Attributes** (oval)
- **Simple Circles (for Specialization and Generalization)**
- **Participation constraints** (single / double line)
- **Cardinality labels** (`1`, `N`, `M`)

### Editing & Interaction
- Mouse drag to move shapes
- Resize shapes using handles
- Snap-to-grid movement and resizing
- Batch selection (drag selection box)
- Multi-select with `Shift + Click`
- Delete single shape, batch delete, or delete selected edge
- Copy / paste selection (paste at mouse position)
- Inline editing of:
  - Shape labels
  - Edge cardinalities
- Undo (`Ctrl + Z`)
- Pan canvas (`Space + Drag` or Middle Mouse)
- Zoom (`Ctrl + Mouse Wheel`)

### Syntax → Diagram
Write textual ER/EER syntax and generate diagrams instantly.

Example:
```

entity Student at (100,100)
entity Course at (350,100)

relationship Enrolls at (220,180)

attribute id of Student
attribute name of Student

connect Student Enrolls 1 N total
connect Course Enrolls 1 N partial

```

### Persistence
- Save/Load diagram as JSON
---

## 🧠 Why This Exists

- Need **offline ER/EER modeling**
- Focus on **database semantics**, not generic shapes
- Hackable, readable codebase (no framework lock-in)
- Suitable for:
  - University projects
  - Teaching ER/EER
  - Database design sessions

---

## 🚀 Getting Started

1. Clone the repository:
```bash
   git clone https://github.com/Reza-namvaran/DB-Sketch
```

2. Open `index.html` in your browser.
3. Start drawing or writing syntax.

That’s it.

---

## ⌨️ Keyboard Shortcuts

| Action            | Shortcut      |
| ----------------- | ------------- |
| Pan               | Space + Drag  |
| Zoom              | Ctrl + Scroll |
| Undo              | Ctrl + Z      |
| Copy              | Ctrl + C      |
| Paste             | Ctrl + V      |
| Delete            | Delete        |
| Cancel / Deselect | Esc           |

---

## 📄 Syntax Reference

### Entities

```
entity Student at (100,100)
weak_entity Enrollment at (200,200)
```

### Attributes

```
attribute id of Student
attribute name of Student
```

### Relationships

```
relationship Enrolls at (300,150)
```

### Connections

```
connect Student Enrolls 1 N total
connect Course Enrolls 1 N partial
```

---

## 📦 Project Structure (Simple)

```
index.html
style.css
script.js
README.md
```

Everything is intentionally kept simple and hackable.

---

## 🧭 Roadmap (Optional / Future)

* Collaborative editing (WebSocket backend)
* Semantic validation (weak entity rules, etc.)
* Export to SQL schema
* Export to DBML / Mermaid
* Group resize
* Edge selection improvements
* Add Edit existing shapes via editor
* Fix Resizing bugs

---

## ❤️ Acknowledgments

Inspired by:

* ER/EER database modeling theory based on Fundamentals of Database Systems (by Ramez Elmasri and Shamkant Navathe)
* draw.io (UX inspiration)
* Academic need for offline tools
