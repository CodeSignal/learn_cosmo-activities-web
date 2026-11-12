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

// -----------------------------------------------------------------------
// Scoring groups
// -----------------------------------------------------------------------

function sectionOf(md, heading) {
  const start = md.indexOf(`### ${heading}\n`);
  assert.notEqual(start, -1, `missing ### ${heading}`);
  const end = md.indexOf('\n### ', start + 1);
  return md.slice(start, end === -1 ? md.length : end);
}

test('report without scoring groups has no group lines', () => {
  const activity = {
    type: 'Matrix',
    matrix: { rows: ['Cash', 'Inventory'], columns: ['Debit', 'Credit'], correctColumnIndexByRow: [0, 1] }
  };
  const results = [
    { text: 'Row 1', selected: 'Debit', correct: 'Debit' },
    { text: 'Row 2', selected: 'Debit', correct: 'Credit' }
  ];
  const md = buildActivityReportMarkdown(activity, results);
  assert.doesNotMatch(md, /Points:|Scoring group/);
  assert.match(md, /## Summary\n\n\*\*Score:\*\* 1 \/ 2 correct\n\n---/);
});

test('report matrix shows points, the group result, and each row in its group', () => {
  const activity = {
    type: 'Matrix',
    matrix: {
      rows: ['Cash', 'Inventory', 'Sales'],
      columns: ['Debit', 'Credit'],
      correctColumnIndexByRow: [0, 1, 1]
    },
    scoringGroups: [{ title: 'Rows 1-3', members: [0, 1, 2] }]
  };
  const results = [
    { text: 'Row 1', selected: 'Debit', correct: 'Debit' },
    { text: 'Row 2', selected: 'Credit', correct: 'Credit' },
    { text: 'Row 3', selected: 'Debit', correct: 'Credit' }
  ];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /\*\*Score:\*\* 2 \/ 3 correct/);
  assert.match(md, /\*\*Points:\*\* 0 \/ 3/);
  assert.match(md, /\*\*Scoring groups\*\* \(all or nothing: a group earns its points only when every scored row in it is correct\)/);
  assert.match(md, /- \*\*Rows 1-3:\*\* 2 of 3 rows correct, 0 \/ 3 points/);
  for (const row of ['Cash', 'Inventory', 'Sales']) {
    assert.match(sectionOf(md, row), /- \*\*Scoring group:\*\* Rows 1-3 \(all or nothing\)/);
  }
});

test('report mcq marks grouped questions only', () => {
  const question = (id) => ({
    id,
    text: `Q${id + 1}`,
    textHtml: `<p>Q${id + 1}</p>`,
    isMultiSelect: false,
    options: [{ label: 'A', text: 'Yes' }, { label: 'B', text: 'No' }]
  });
  const activity = {
    type: 'Multiple Choice',
    mcq: { questions: [question(0), question(1), question(2)] },
    scoringGroups: [{ title: 'Questions 1-2', members: [0, 1] }]
  };
  const results = [
    { text: 'Question 1', selected: 'A', correct: 'A' },
    { text: 'Question 2', selected: 'B', correct: 'B' },
    { text: 'Question 3', selected: 'A', correct: 'B' }
  ];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /\*\*Points:\*\* 2 \/ 3/);
  assert.match(md, /- \*\*Questions 1-2:\*\* 2 of 2 questions correct, 2 \/ 2 points/);
  assert.match(sectionOf(md, 'Question 1'), /Scoring group:\*\* Questions 1-2/);
  assert.match(sectionOf(md, 'Question 2'), /Scoring group:\*\* Questions 1-2/);
  assert.doesNotMatch(sectionOf(md, 'Question 3'), /Scoring group/);
});

test('report text input counts unscored members and groups with nothing to score', () => {
  const activity = {
    type: 'Text Input',
    textInput: {
      questions: [
        { id: 0, text: 'Capital?', correctAnswer: 'Paris', validation: { kind: 'string', options: {} } },
        { id: 1, text: 'Why?', validation: { kind: 'validate-later', options: {} } },
        { id: 2, text: 'Explain more', validation: { kind: 'validate-later', options: {} } },
        { id: 3, text: 'And more', validation: { kind: 'validate-later', options: {} } }
      ]
    },
    scoringGroups: [
      { title: 'Questions 1-2', members: [0, 1] },
      { title: 'Questions 3-4', members: [2, 3] }
    ]
  };
  const results = [
    { text: 'Question 1', selected: 'Paris', correct: 'Paris' },
    { text: 'Question 2', selected: 'Because.', correct: '' },
    { text: 'Question 3', selected: 'More.', correct: '' },
    { text: 'Question 4', selected: 'Even more.', correct: '' }
  ];
  const md = buildActivityReportMarkdown(activity, results);
  assert.match(md, /\*\*Points:\*\* 1 \/ 1/);
  assert.match(md, /- \*\*Questions 1-2:\*\* 1 of 1 question correct, 1 \/ 1 points \(1 not scored\)/);
  assert.match(md, /- \*\*Questions 3-4:\*\* not scored \(no question in it is scored automatically\)/);
  assert.match(sectionOf(md, 'Question 2'), /Not scored \(submitted for later review\)[\s\S]*Scoring group:\*\* Questions 1-2/);
});
