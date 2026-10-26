const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SCRIPT = path.resolve(__dirname, '..', 'generate-score.js');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-score-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScorer(dir, questionMd, answerMd, answerKeyMd) {
  const qFile = path.join(dir, 'question.md');
  const aFile = path.join(dir, 'answer.md');
  const akFile = path.join(dir, 'answer-key.md');
  const reportFile = path.join(dir, 'report.md');
  const scoreFile = path.join(dir, 'score.json');

  fs.writeFileSync(qFile, questionMd, 'utf8');
  fs.writeFileSync(aFile, answerMd, 'utf8');
  fs.writeFileSync(akFile, answerKeyMd, 'utf8');

  execFileSync(process.execPath, [
    SCRIPT,
    '--question', qFile,
    '--answer', aFile,
    '--answer-key', akFile,
    '--report', reportFile,
    '--score', scoreFile,
  ], { timeout: 10000 });

  return {
    report: fs.readFileSync(reportFile, 'utf8'),
    score: JSON.parse(fs.readFileSync(scoreFile, 'utf8')),
  };
}

// -----------------------------------------------------------------------
// CLI validation
// -----------------------------------------------------------------------

test('exits with non-zero when required arguments are missing', () => {
  assert.throws(
    () => execFileSync(process.execPath, [SCRIPT], { timeout: 5000 }),
    (err) => err.status !== 0
  );
});

// -----------------------------------------------------------------------
// Multiple Choice
// -----------------------------------------------------------------------

test('MCQ: scores a correct answer', () => {
  withTempDir(dir => {
    const { score, report } = runScorer(dir,
      // Stripped question.md (no correct markers)
      `__Type__

Multiple Choice

__Practice Question__

What color is the sky?

A. Red
B. Blue
C. Green

__Suggested Answers__

- A
- B
- C
`,
      // Candidate's answer.md
      `__Type__

Multiple Choice

__Responses__

1. **Question 1**
   - Selected Answer: B
`,
      // answer-key.md
      `__Type__

Multiple Choice

__Answer Key__

- Question 1: B
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 1);
    assert.match(report, /Correct/);
  });
});

test('MCQ: scores an incorrect answer', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Multiple Choice

__Practice Question__

What color is the sky?

A. Red
B. Blue
C. Green

__Suggested Answers__

- A
- B
- C
`,
      `__Type__

Multiple Choice

__Responses__

1. **Question 1**
   - Selected Answer: A
`,
      `__Type__

Multiple Choice

__Answer Key__

- Question 1: B
`
    );

    assert.equal(score.totalScore, 0);
    assert.equal(score.maxScore, 1);
  });
});

test('MCQ: scores multiple questions with mixed results', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Multiple Choice

__Practice Question__

Question one?

A. Alpha
B. Bravo

__Suggested Answers__

- A
- B

__Practice Question__

Question two?

A. Cat
B. Dog

__Suggested Answers__

- A
- B
`,
      `__Type__

Multiple Choice

__Responses__

1. **Question 1**
   - Selected Answer: A

2. **Question 2**
   - Selected Answer: A
`,
      `__Type__

Multiple Choice

__Answer Key__

- Question 1: A
- Question 2: B
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 2);
  });
});

test('MCQ: multi-select answer', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Multiple Choice

__Practice Question__

Pick two.

A. One
B. Two
C. Three

__Suggested Answers__

- A
- B
- C
`,
      `__Type__

Multiple Choice

__Responses__

1. **Question 1**
   - Selected Answer: A, C
`,
      `__Type__

Multiple Choice

__Answer Key__

- Question 1: A, C
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 1);
  });
});

// -----------------------------------------------------------------------
// Fill in the Blanks
// -----------------------------------------------------------------------

test('FIB: scores blanks correctly', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Fill In The Blanks

__Markdown With Blanks__

Fill in the blanks

> The [[blank]] sat on the [[blank]].

__Suggested Answers__

- cat
- mat
- bat
`,
      `__Type__

Fill In The Blanks

__Responses__

1. **Blank 1**
   - Selected Answer: cat

2. **Blank 2**
   - Selected Answer: rug
`,
      `__Type__

Fill In The Blanks

__Answer Key__

- Blank 1: cat
- Blank 2: mat
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 2);
  });
});

test('FIB: all blanks correct', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Fill In The Blanks

__Markdown With Blanks__

Fill in

> The [[blank]] sat on the [[blank]].

__Suggested Answers__

- cat
- mat
`,
      `__Type__

Fill In The Blanks

__Responses__

1. **Blank 1**
   - Selected Answer: cat

2. **Blank 2**
   - Selected Answer: mat
`,
      `__Type__

Fill In The Blanks

__Answer Key__

- Blank 1: cat
- Blank 2: mat
`
    );

    assert.equal(score.totalScore, 2);
    assert.equal(score.maxScore, 2);
  });
});

// -----------------------------------------------------------------------
// Matching
// -----------------------------------------------------------------------

test('Matching: scores items correctly', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Matching

__Markdown With Blanks__

> **Cue 1**: Avoiding eye contact. [[blank]]

> **Cue 2**: Nodding and smiling. [[blank]]

__Suggested Answers__

- Discomfort
- Engagement
`,
      `__Type__

Matching

__Responses__

1. **Item 1**
   - Selected Answer: Discomfort

2. **Item 2**
   - Selected Answer: Engagement
`,
      `__Type__

Matching

__Answer Key__

- Item 1: Discomfort
- Item 2: Engagement
`
    );

    assert.equal(score.totalScore, 2);
    assert.equal(score.maxScore, 2);
  });
});

test('Matching: one wrong, one right', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Matching

__Markdown With Blanks__

> **Cue 1**: Avoiding eye contact. [[blank]]

> **Cue 2**: Nodding and smiling. [[blank]]

__Suggested Answers__

- Discomfort
- Engagement
`,
      `__Type__

Matching

__Responses__

1. **Item 1**
   - Selected Answer: Engagement

2. **Item 2**
   - Selected Answer: Engagement
`,
      `__Type__

Matching

__Answer Key__

- Item 1: Discomfort
- Item 2: Engagement
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 2);
  });
});

// -----------------------------------------------------------------------
// Sort Into Boxes
// -----------------------------------------------------------------------

test('Sort: scores categorization correctly', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Sort Into Boxes

__Practice Question__

Sort by tone.

__Categories__

- Positive
- Negative

__Items__

- Great job!
- Terrible work
`,
      `__Type__

Sort Into Boxes

__Responses__

1. **Great job!**
   - Selected Answer: Positive

2. **Terrible work**
   - Selected Answer: Negative
`,
      `__Type__

Sort Into Boxes

__Answer Key__

- Great job!: Positive
- Terrible work: Negative
`
    );

    assert.equal(score.totalScore, 2);
    assert.equal(score.maxScore, 2);
  });
});

test('Sort: one wrong categorization', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Sort Into Boxes

__Practice Question__

Sort by tone.

__Categories__

- Positive
- Negative

__Items__

- Great job!
- Terrible work
`,
      `__Type__

Sort Into Boxes

__Responses__

1. **Great job!**
   - Selected Answer: Positive

2. **Terrible work**
   - Selected Answer: Positive
`,
      `__Type__

Sort Into Boxes

__Answer Key__

- Great job!: Positive
- Terrible work: Negative
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 2);
  });
});

// -----------------------------------------------------------------------
// Swipe Left or Right
// -----------------------------------------------------------------------

test('Swipe: scores left/right items correctly', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Swipe Left or Right

__Practice Question__

Adaptive or traditional?

__Labels__

- Left Label: Adaptive
- Right Label: Traditional

__Items__

- Adjusting style per person
- Same approach for everyone
`,
      `__Type__

Swipe Left or Right

__Responses__

1. **Adjusting style per person**
   - Selected Answer: Adaptive

2. **Same approach for everyone**
   - Selected Answer: Traditional
`,
      `__Type__

Swipe Left or Right

__Answer Key__

- Adjusting style per person: Adaptive
- Same approach for everyone: Traditional
`
    );

    assert.equal(score.totalScore, 2);
    assert.equal(score.maxScore, 2);
  });
});

test('Swipe: one wrong', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Swipe Left or Right

__Practice Question__

Adaptive or traditional?

__Labels__

- Left Label: Adaptive
- Right Label: Traditional

__Items__

- Adjusting style per person
- Same approach for everyone
`,
      `__Type__

Swipe Left or Right

__Responses__

1. **Adjusting style per person**
   - Selected Answer: Traditional

2. **Same approach for everyone**
   - Selected Answer: Traditional
`,
      `__Type__

Swipe Left or Right

__Answer Key__

- Adjusting style per person: Adaptive
- Same approach for everyone: Traditional
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 2);
  });
});

// -----------------------------------------------------------------------
// Matrix
// -----------------------------------------------------------------------

test('Matrix: scores row selections correctly', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Matrix

__Practice Question__

Send or not?

__Matrix Columns__

- Send
- Do not send

__Matrix Rows__

- Blaze
- Echohawk
`,
      `__Type__

Matrix

__Responses__

1. **Row 1**
   - Selected Answer: Send

2. **Row 2**
   - Selected Answer: Do not send
`,
      `__Type__

Matrix

__Answer Key__

- Blaze: Send
- Echohawk: Do not send
`
    );

    assert.equal(score.totalScore, 2);
    assert.equal(score.maxScore, 2);
  });
});

test('Matrix: one wrong', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Matrix

__Practice Question__

Send or not?

__Matrix Columns__

- Send
- Do not send

__Matrix Rows__

- Blaze
- Echohawk
`,
      `__Type__

Matrix

__Responses__

1. **Row 1**
   - Selected Answer: Send

2. **Row 2**
   - Selected Answer: Send
`,
      `__Type__

Matrix

__Answer Key__

- Blaze: Send
- Echohawk: Do not send
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 2);
  });
});

// -----------------------------------------------------------------------
// Text Input
// -----------------------------------------------------------------------

test('Text Input: scores string answer correctly', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Text Input

__Practice Question__

What is the capital of France?

__Correct Answers__

`,
      `__Type__

Text Input

__Responses__

1. **Question 1**
   - Selected Answer: Paris
`,
      `__Type__

Text Input

__Answer Key__

- Question 1: Paris [kind: string] [options: caseSensitive=false]
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 1);
  });
});

test('Text Input: case insensitive match', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Text Input

__Practice Question__

What is the capital of France?

__Correct Answers__

`,
      `__Type__

Text Input

__Responses__

1. **Question 1**
   - Selected Answer: paris
`,
      `__Type__

Text Input

__Answer Key__

- Question 1: Paris [kind: string] [options: caseSensitive=false]
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 1);
  });
});

test('Text Input: wrong answer', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Text Input

__Practice Question__

What is the capital of France?

__Correct Answers__

`,
      `__Type__

Text Input

__Responses__

1. **Question 1**
   - Selected Answer: London
`,
      `__Type__

Text Input

__Answer Key__

- Question 1: Paris [kind: string] [options: caseSensitive=false]
`
    );

    assert.equal(score.totalScore, 0);
    assert.equal(score.maxScore, 1);
  });
});

test('Text Input: numeric answer within threshold', () => {
  withTempDir(dir => {
    const { score } = runScorer(dir,
      `__Type__

Text Input

__Practice Question__

What is 2 + 2?

__Correct Answers__

`,
      `__Type__

Text Input

__Responses__

1. **Question 1**
   - Selected Answer: 4
`,
      `__Type__

Text Input

__Answer Key__

- Question 1: 4 [kind: numeric] [options: threshold=0.01,precision=2]
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 1);
  });
});

// -----------------------------------------------------------------------
// Report output verification
// -----------------------------------------------------------------------

test('generates report.md with expected sections', () => {
  withTempDir(dir => {
    const { report } = runScorer(dir,
      `__Type__

Multiple Choice

__Practice Question__

Pick one.

A. Alpha
B. Bravo

__Suggested Answers__

- A
- B
`,
      `__Type__

Multiple Choice

__Responses__

1. **Question 1**
   - Selected Answer: B
`,
      `__Type__

Multiple Choice

__Answer Key__

- Question 1: B
`
    );

    assert.match(report, /Activity report/i);
    assert.match(report, /Multiple Choice/);
    assert.match(report, /Score/);
    assert.match(report, /1 \/ 1 correct/);
  });
});

// -----------------------------------------------------------------------
// MCQ with explain-your-answer
// -----------------------------------------------------------------------

test('MCQ: handles explanation in answer.md', () => {
  withTempDir(dir => {
    const { score, report } = runScorer(dir,
      `__Type__

Multiple Choice

__Practice Question__

Why is the sky blue?

A. Sunlight
B. Rayleigh scattering
C. Magic

__Suggested Answers__

- A
- B
- C

__Explain Your Answer__

true
`,
      `__Type__

Multiple Choice

__Responses__

1. **Question 1**
   - Selected Answer: B
   - Explanation: Light scatters off molecules in the atmosphere.
`,
      `__Type__

Multiple Choice

__Answer Key__

- Question 1: B
`
    );

    assert.equal(score.totalScore, 1);
    assert.equal(score.maxScore, 1);
    assert.match(report, /Light scatters off molecules/);
  });
});

// -----------------------------------------------------------------------
// Output files are created in nested directories
// -----------------------------------------------------------------------

test('creates output directories if they do not exist', () => {
  withTempDir(dir => {
    const qFile = path.join(dir, 'question.md');
    const aFile = path.join(dir, 'answer.md');
    const akFile = path.join(dir, 'answer-key.md');
    const reportFile = path.join(dir, 'nested', 'deep', 'report.md');
    const scoreFile = path.join(dir, 'another', 'path', 'score.json');

    fs.writeFileSync(qFile, `__Type__\n\nMultiple Choice\n\n__Practice Question__\n\nQ?\n\nA. X\n\n__Suggested Answers__\n\n- A\n`, 'utf8');
    fs.writeFileSync(aFile, `__Type__\n\nMultiple Choice\n\n__Responses__\n\n1. **Question 1**\n   - Selected Answer: A\n`, 'utf8');
    fs.writeFileSync(akFile, `__Type__\n\nMultiple Choice\n\n__Answer Key__\n\n- Question 1: A\n`, 'utf8');

    execFileSync(process.execPath, [
      SCRIPT,
      '--question', qFile,
      '--answer', aFile,
      '--answer-key', akFile,
      '--report', reportFile,
      '--score', scoreFile,
    ], { timeout: 10000 });

    assert.ok(fs.existsSync(reportFile), 'report.md should exist in nested dir');
    assert.ok(fs.existsSync(scoreFile), 'score.json should exist in nested dir');
  });
});
