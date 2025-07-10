# Updated Correction Rules Documentation

## Summary of Changes

The correction rules in `lib/openai-service.ts` have been updated to be more consistent and comprehensive across both the `checkGrammar()` and `generateAIResponse()` functions.

## New Correction Philosophy

### ✅ WHAT TO CORRECT (Focus on Learning Value)
- **Spelling mistakes** - Clear misspellings that impact comprehension
- **Grammar errors** - Wrong verb conjugation, incorrect articles, word order issues
- **Wrong vocabulary usage** - Incorrect word choice that changes meaning
- **Inappropriate content** - Content that doesn't fit the context

### ❌ WHAT NOT TO CORRECT (Ignore Style/Formatting)
- **Missing punctuation** (.,!?;:) - Never correct these
- **Missing capitalization** at sentence start - Ignore these
- **Capitalization of names/places** - Only correct if clearly a proper noun error
- **Spacing/formatting issues** - Ignore extra spaces, trailing spaces
- **Style preferences** - Don't correct when meaning is clear
- **Regional variations** or informal speech patterns
- **Word order** that is understandable even if not perfect

## Examples Added

### What NOT to Correct:
```
✗ "hallo" → "Hallo." (missing capitalization/punctuation)
✗ "waar is de winkel" → "Waar is de winkel?" (missing question mark/capitalization)
✗ "ja dat is goed" → "Ja, dat is goed." (missing comma/punctuation)
✗ "amsterdam" → "Amsterdam"  
✗ "ik  woon  hier" → "ik woon hier" (extra spaces)
```

### What TO Correct:
```
✓ "ik ben gegaan naar school gisteren" → "ik ging gisteren naar school" (wrong tense)
✓ "de huis" → "het huis" (wrong article)
✓ "ik heb honger voor eten" → "ik heb trek in eten" (wrong preposition)
✓ "zij ben" → "zij is" (wrong verb conjugation)
✓ "ik kan Nederlands spreken goed" → "ik kan goed Nederlands spreken" (word order)
```

## Consistency Improvements

1. **Unified terminology** - Both functions now use the same correction philosophy
2. **Clear examples** - Specific examples of what to correct vs. ignore
3. **Learning-focused** - Rules emphasize educational value over perfectionism
4. **User-friendly** - Reduces over-correction that might frustrate learners

## Implementation

The updated rules are implemented in:
- `checkGrammar()` function (line ~591-620) - For the dedicated grammar correction endpoint
- `generateAIResponse()` function (line ~270-295) - For chat conversations with corrections

Both functions now follow the same correction philosophy, ensuring consistent behavior across the Dutch chat application.

## Testing Recommendations

To verify the updated rules work correctly:

1. **Test punctuation tolerance**: Send "hallo" - should NOT be corrected to "Hallo."
2. **Test capitalization tolerance**: Send "amsterdam is mooi" - should NOT be corrected for capitalization
3. **Test spacing tolerance**: Send "ik  ben  hier" - should NOT be corrected for extra spaces
4. **Test grammar correction**: Send "de huis" - SHOULD be corrected to "het huis"
5. **Test verb conjugation**: Send "zij ben" - SHOULD be corrected to "zij is"

This ensures the AI focuses on meaningful corrections that help learning rather than nitpicking style issues.
