# Product Requirements Document: Multiple Choice Question (MCQ) Module

## Overview
This document defines the requirements for implementing a Multiple Choice Question (MCQ) activity module that allows users to answer single-select or multi-select multiple choice questions. The module will follow the same architectural patterns as existing activity modules (Fill In The Blanks, Sort Into Boxes, Swipe Left/Right) and support multiple questions per markdown file.

## Goals
- Enable users to answer multiple choice questions with single or multiple correct answers
- Support multiple questions per markdown file with scrollable presentation
- Automatically save answers to `answer.md` on every answer change
- Maintain consistency with existing activity module patterns

## Markdown File Format

### Single Question Format
```
__Type__

Multiple Choice

__Practice Question__

[Question text here]

A. [Option A text]
B. [Option B text]
C. [Option C text]
D. [Option D text]

__Suggested Answers__

- A
- B - Correct
- C
- D
```

### Multiple Questions Format
Multiple questions are supported by repeating the `__Practice Question__` and `__Suggested Answers__` sections:

```
__Type__

Multiple Choice

__Practice Question__

[First question text]

A. [Option A]
B. [Option B]
C. [Option C]

__Suggested Answers__

- A
- B - Correct
- C

__Practice Question__

[Second question text]

A. [Option A]
B. [Option B]
C. [Option C]

__Suggested Answers__

- A - Correct
- B - Correct
- C
```

### Answer Detection Rules
- **Single correct answer**: Only one option in `__Suggested Answers__` is marked with `- Correct`
  - Use radio button UI (mutually exclusive selection)
- **Multiple correct answers**: Two or more options in `__Suggested Answers__` are marked with `- Correct`
  - Use checkbox UI (multiple selections allowed)

### Option Format
- Options must be labeled with single letters (A, B, C, D, etc.) followed by a period
- Options can appear in any order in the question text
- The `__Suggested Answers__` section lists all options with their correctness status
- Options without `- Correct` are incorrect answers

## Server-Side Requirements

### Markdown Parsing (`server.js`)
The `buildActivityFromMarkdown` function must be extended to handle MCQ type:

1. **Type Detection**
   - Recognize `__Type__` section containing "Multiple Choice" (case-insensitive)

2. **Question Parsing**
   - Extract all `__Practice Question__` sections (can be multiple)
   - For each question:
     - Extract the question text (all content between `__Practice Question__` and the next section)
     - Parse option labels (A., B., C., etc.) and their text
     - Extract corresponding `__Suggested Answers__` section
     - Parse which options are marked as "Correct"
     - Determine if question is single-select or multi-select based on number of correct answers

3. **Activity Object Structure**
   ```javascript
   {
     type: "Multiple Choice",
     question: null, // Not used for MCQ (questions are in mcq.questions array)
     mcq: {
       questions: [
         {
           id: 0, // Sequential index
           text: "Question text here",
           options: [
             { label: "A", text: "Option A text", correct: false },
             { label: "B", text: "Option B text", correct: true },
             { label: "C", text: "Option C text", correct: false },
             { label: "D", text: "Option D text", correct: false }
           ],
           isMultiSelect: false // true if 2+ correct answers
         },
         // ... more questions
       ]
     }
   }
   ```

4. **Answer Report Generation**
   When posting results to `/api/results`, the server must generate `answer.md` with:
   ```
   __Type__
   
   Multiple Choice
   
   __Summary__
   
   [X]/[Y] correct
   
   __Responses__
   
   1. **Question 1**
      - Selected Answer: A, B
      - Correct Answer: B
      - Result: ✗ Incorrect
   
   2. **Question 2**
      - Selected Answer: A, C
      - Correct Answer: A, C
      - Result: ✓ Correct
   
   [For each question, include:]
   __Practice Question__
   
   [Question text]
   
   A. [Option A]
   B. [Option B]
   ...
   
   __Suggested Answers__
   
   - A
   - B - Correct
   ...
   ```

## Client-Side Requirements

### Module Structure (`public/modules/mcq.js`)
Follow the same pattern as `fib.js`, `sort.js`, and `swipe.js`:

1. **Export Function**
   ```javascript
   export function initMcq({ activity, state, postResults })
   ```

2. **Initialization**
   - Render all questions in a scrollable container
   - Each question should be clearly separated visually
   - Questions should be numbered (Question 1, Question 2, etc.)

3. **UI Components**

   **Single-Select Questions (Radio Buttons)**
   - Render as radio button group
   - Only one option can be selected at a time
   - Selecting a new option deselects the previous one
   - Use standard HTML radio inputs with proper labels

   **Multi-Select Questions (Checkboxes)**
   - Render as checkbox group
   - Multiple options can be selected
   - Use standard HTML checkbox inputs with proper labels

4. **Answer Tracking**
   - Track selected answers per question in local state
   - Format: `{ questionId: [selectedOptionLabels] }`
   - For single-select: array contains one label (e.g., `["B"]`)
   - For multi-select: array contains multiple labels (e.g., `["A", "C"]`)

5. **Real-Time Updates**
   - Call `postResults()` immediately when any answer changes
   - Update `state.results` array before posting:
     ```javascript
     state.results = activity.mcq.questions.map((q, idx) => {
       const selected = selectedAnswers[q.id] || [];
       const correct = q.options.filter(opt => opt.correct).map(opt => opt.label);
       const isCorrect = arraysEqual(selected.sort(), correct.sort());
       return {
         text: `Question ${idx + 1}`,
         selected: selected.join(', '), // "B" or "A, C"
         correct: correct.join(', ') // "B" or "A, C"
       };
     });
     ```
   - Update `state.index` to reflect number of answered questions

6. **Visual Feedback**
   - Questions should be visually distinct
   - Consider adding spacing/padding between questions
   - Option labels (A, B, C, D) should be clearly visible
   - Selected options should have clear visual indication

7. **Accessibility**
   - Use proper form semantics (`<fieldset>`, `<legend>`)
   - Associate labels with inputs using `for`/`id` attributes
   - Support keyboard navigation
   - Use ARIA attributes where appropriate
   - Ensure screen reader compatibility

8. **Cleanup Function**
   - Return cleanup function to remove event listeners and DOM elements
   - Follow same pattern as other modules

### Integration (`public/app.js`)
1. **Import Module**
   ```javascript
   import { initMcq } from './modules/mcq.js';
   ```

2. **Activity Initialization**
   Add to `initActivity` function:
   ```javascript
   else if (/^multiple choice$/i.test(activity.type)) {
     currentActivity = initMcq({ activity, state, postResults });
   }
   ```

3. **State Management**
   - MCQ doesn't use `state.items` (leave as empty array or null)
   - MCQ uses `state.results` array
   - MCQ uses `state.index` to track answered questions

## Answer Format Specification

### Results Array Structure
Each result object in `state.results`:
```javascript
{
  text: "Question 1", // or "Question 2", etc.
  selected: "B", // or "A, C" for multi-select
  correct: "B", // or "A, C" for multi-select
}
```

### Correctness Determination
- **Single-select**: Selected answer matches the single correct answer
- **Multi-select**: 
  - Selected answers array must match correct answers array exactly
  - Order doesn't matter (compare sorted arrays)
  - Must have same number of selections as correct answers

## Edge Cases & Error Handling

1. **No Questions**
   - If markdown file has no `__Practice Question__` sections, show error message

2. **Missing Suggested Answers**
   - If a question has no corresponding `__Suggested Answers__` section, skip that question or show error

3. **No Correct Answers**
   - If `__Suggested Answers__` has no `- Correct` markers, treat as single-select with no correct answer (all incorrect)

4. **Invalid Option Labels**
   - Options not matching pattern (Letter + period) should be ignored or handled gracefully

5. **Mismatched Options**
   - If `__Suggested Answers__` references options not in question text, include them but mark as invalid

6. **Empty Selections**
   - Allow users to submit with unanswered questions
   - Unanswered questions should show as "No answer selected" in results

## Testing Considerations

1. **Single Question, Single Answer**
   - Test with `mcq.md` example

2. **Multiple Questions**
   - Test with `mcq-2-questions.md` example
   - Verify scrolling works
   - Verify each question tracks answers independently

3. **Multi-Select Questions**
   - Test with `mcq-multi-answer.md` example
   - Verify checkbox behavior
   - Verify multiple selections are tracked correctly

4. **Answer Persistence**
   - Verify answers are posted to server on every change
   - Verify `answer.md` is updated correctly
   - Verify answer format matches specification

5. **Accessibility**
   - Test with keyboard navigation
   - Test with screen reader
   - Verify proper ARIA attributes

## Implementation Notes

1. **Styling**
   - MCQ module should use consistent styling with other modules
   - Consider adding CSS classes: `.mcq`, `.mcq-question`, `.mcq-option`, `.mcq-radio`, `.mcq-checkbox`
   - Questions should have sufficient spacing for readability

2. **Performance**
   - Posting on every change should be efficient (debouncing not required per user request)
   - Rendering multiple questions should be performant

3. **Future Enhancements** (Out of Scope)
   - Question shuffling
   - Option shuffling
   - Progress indicator
   - Question navigation (prev/next buttons)

## Success Criteria

- [ ] MCQ module renders single-select questions with radio buttons
- [ ] MCQ module renders multi-select questions with checkboxes
- [ ] Multiple questions per file are displayed in scrollable format
- [ ] Answers are posted to server on every change
- [ ] `answer.md` file is generated with correct format
- [ ] Correctness is determined accurately for both single and multi-select
- [ ] Module follows same architectural patterns as existing modules
- [ ] Accessibility requirements are met
- [ ] All edge cases are handled gracefully

