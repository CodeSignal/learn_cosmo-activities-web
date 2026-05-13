const test = require('node:test');
const assert = require('node:assert/strict');

const { buildActivityReportMarkdown } = require('../lib/build-activity-report');

test('report includes title, summary, and MCQ sections', () => {
  const activity = {
    type: 'Multiple Choice',
    mcq: {
      questions: [
        {
          id: 0,
          text: 'Pick one',
          textHtml: '<p>Pick one</p>',
          isMultiSelect: false,
          options: [
            { label: 'A', text: 'Apple', correct: true },
            { label: 'B', text: 'Berry', correct: false }
          ]
        }
      ]
    }
  };
  const results = [{ text: 'Question 1', selected: 'A', correct: 'A' }];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /^# Activity report/m);
  assert.match(md, /\*\*Activity type:\*\* Multiple Choice/);
  assert.match(md, /\*\*Score:\*\* 1 \/ 1 correct/);
  assert.match(md, /### Question 1/);
  assert.match(md, /Pick one/);
  assert.match(md, /\*\*Options\*\*/);
  assert.match(md, /\*\*A\.\*\* Apple/);
  assert.match(md, /\*\*B\.\*\* Berry/);
  assert.match(md, /\*\*Candidate's Answer:\*\* A\b/);
  assert.match(md, /\*\*Correct answer\(s\):\*\* A\b/);
  assert.match(md, /\*\*Result:\*\* Correct/);
});

test('report mcq formats multiple selections as comma-separated letters', () => {
  const activity = {
    type: 'Multiple Choice',
    mcq: {
      questions: [
        {
          id: 0,
          text: 'Pick two',
          textHtml: '<p>Pick two</p>',
          isMultiSelect: true,
          options: [
            { label: 'A', text: 'Alpha', correct: true },
            { label: 'B', text: 'Beta', correct: true },
            { label: 'C', text: 'Gamma', correct: false }
          ]
        }
      ]
    }
  };
  const results = [{ text: 'Question 1', selected: 'A, B', correct: 'A, B' }];
  const md = buildActivityReportMarkdown(activity, results);
  assert.ok(md.includes('**Options**'));
  assert.ok(md.includes('- **A.** Alpha'));
  assert.ok(md.includes('- **C.** Gamma'));
  assert.ok(md.includes("- **Candidate's Answer:** A, B"));
  assert.ok(md.includes('- **Correct answer(s):** A, B'));
});

test('report text input shows validate-later as not scored', () => {
  const activity = {
    type: 'Text Input',
    textInput: {
      questions: [
        {
          id: 0,
          text: 'Explain',
          textHtml: '<p>Explain</p>',
          validation: { kind: 'validate-later', options: {} },
          correctAnswer: '',
          correctAnswers: []
        }
      ]
    }
  };
  const results = [{ text: 'Question 1', selected: 'Some text', correct: '' }];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /Not scored/);
  assert.match(md, /\*\*Score:\*\* 0 \/ 0 correct/);
  assert.match(md, /\*\*Candidate's Answer:\*\* Some text/);
});

test('report matrix uses row labels', () => {
  const activity = {
    type: 'Matrix',
    matrix: {
      rows: ['Row A', 'Row B'],
      columns: ['C1', 'C2'],
      correctColumnIndexByRow: [0, 1]
    }
  };
  const results = [
    { text: 'Row 1', selected: 'C1', correct: 'C1' },
    { text: 'Row 2', selected: 'C1', correct: 'C2' }
  ];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /### Row A/);
  assert.match(md, /### Row B/);
  assert.match(md, /\*\*Result:\*\* Incorrect/);
});

test('report matrix includes heading and practice question once', () => {
  const activity = {
    type: 'Matrix',
    question: 'Pick the correct column.',
    questionHtml: '<p>Pick the correct column.</p>',
    matrix: {
      heading: {
        markdown: 'Scenario intro',
        html: '<p>Scenario intro</p>'
      },
      rows: ['R1'],
      columns: ['A', 'B'],
      correctColumnIndexByRow: [0]
    }
  };
  const results = [{ text: 'R1', selected: 'A', correct: 'A' }];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /### Heading/);
  assert.match(md, /Scenario intro/);
  assert.match(md, /### Question/);
  assert.match(md, /Pick the correct column/);
});

test('report empty results', () => {
  const md = buildActivityReportMarkdown({ type: 'Text Input', textInput: { questions: [] } }, []);
  assert.match(md, /No responses recorded/);
});

test('fibFullQuestionWithBlankLabels replaces blanks with numbered labels', () => {
  const { fibFullQuestionWithBlankLabels } = require('../lib/build-activity-report');
  const content = '> First [[blank:a]] then [[blank:b]] end.';
  assert.equal(fibFullQuestionWithBlankLabels(content), 'First [Blank 1] then [Blank 2] end.');
});

test('report FIB shows question once with [Blank N] then per-blank answers', () => {
  const activity = {
    type: 'Fill in the blanks',
    fib: {
      prompt: 'Do this',
      promptHtml: '<p>Do this</p>',
      content: '> The [[blank:cat]] sat on the [[blank:mat]].',
      blanks: [
        { index: 0, answer: 'cat' },
        { index: 1, answer: 'mat' }
      ],
      choices: []
    }
  };
  const results = [
    { text: 'Blank 1', selected: 'cat', correct: 'cat' },
    { text: 'Blank 2', selected: 'rug', correct: 'mat' }
  ];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /### Question/);
  assert.match(md, /The \[Blank 1\] sat on the \[Blank 2\]\./);
  assert.equal((md.match(/\*\*Blank in context:\*\*/g) || []).length, 0);
  assert.match(md, /### Blank 1/);
  assert.match(md, /### Blank 2/);
});
