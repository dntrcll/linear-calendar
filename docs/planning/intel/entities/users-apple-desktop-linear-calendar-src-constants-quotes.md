---
path: /Users/apple/Desktop/linear-calendar/src/constants/quotes.js
type: config
updated: 2026-02-03
status: active
---

# quotes.js

## Purpose

Provides a curated collection of motivational quotes from various philosophical traditions (Stoic, Ancient Eastern, and modern) for display throughout the application. Includes a utility function to retrieve random quotes.

## Exports

- `MOTIVATIONAL_QUOTES` - Array of quote objects with `text` and `author` properties, organized by philosophical category (Stoic Philosophy, Ancient Wisdom, etc.)
- `getRandomQuote` - Function that returns a randomly selected quote from the collection

## Dependencies

None

## Used By

TBD

## Notes

- Quotes are organized into thematic sections via comments (Stoic Philosophy, Ancient Wisdom, etc.)
- Each quote follows the format `{ text: "quote", author: "name" }`
- Contains quotes from Marcus Aurelius, Seneca, Epictetus, Lao Tzu, and others