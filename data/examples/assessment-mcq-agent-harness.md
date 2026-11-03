__Type__

Multiple Choice

__Content__

## Scenario

Maya starts a new session with a coding agent in her team’s repository. The harness is set up like this:

| Part | Setup |
| --- | --- |
| **Project instruction file (e.g., AGENTS.md or CLAUDE.md)** | 30 lines: the build command, the test command, and a rule that public-interface changes need two reviewers |
| **Skills** | Two installed: test-plan-writer and release-notes |
| **MCP Servers** | One connected: the team’s issue tracker |
| **Hooks** | Runs the code formatter after every file edit |
| **Model Effort** | Medium |

The test-plan-writer skill’s preamble:

```text
name: test-plan-writer
description: Writes a test plan from a ticket. Use when the user asks
  for a test plan or test cases.
```

Maya’s first message:

```text
Read PLAT-112 and tell me what QA should check before it ships.
```


[designSystem]
[contentWidth: 35%]

__Practice Question__

Before Maya sends her first message, which of these is already in the agent’s context?

A. The full body of every installed skill
B. Notes from Maya’s previous session
C. The name and description of the release-notes skill
D. The body of test-plan-writer, since it fits her task

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

The agent loads test-plan-writer even though Maya never names it. What does it base that choice on?

A. The skill’s description, compared with Maya’s request
B. The skill the team has used most in past sessions
C. The skill’s full body, which it reads to check the fit
D. A recommendation from the issue-tracker MCP server

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

How does the agent get the contents of PLAT-112?

A. It recalls the ticket from what the model learned in training.
B. The harness fetches it before the model sees Maya’s message.
C. The harness loaded every ticket into context at session start.
D. It calls a tool provided by the issue-tracker MCP server.

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

The agent tries to post a comment on PLAT-112, but the comment never appears. The team connected the tracker using read-only credentials. What stopped the comment?

A. The model, which recognized the credentials were read-only
B. The credentials’ permissions, enforced outside the model
C. The tool’s description, which tells the model writes aren’t allowed
D. The model, following a policy built into its training

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

The body of test-plan-writer says: “For API changes, follow api-checklist.md in this skill’s folder.” When does api-checklist.md enter the agent’s context?

A. At session start, along with the skill’s preamble
B. As soon as the skill is selected, along with its body
C. Only if the agent opens it while following the body
D. Never; the agent can see only a skill’s preamble and body

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

The team’s hook runs the code formatter after every file edit. What makes the formatter run each time?

A. The harness runs it automatically; the model makes no decision.
B. The model reads the hook’s configuration and runs the formatter.
C. The issue-tracker MCP server runs it when it detects a change.
D. The model runs it, but only at medium effort or higher.

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

Maya raises model effort from medium to high. Which statement is true?

A. The session switches to a larger, more capable model.
B. The agent may run commands without asking for approval.
C. The model reasons more before responding, using more tokens.
D. The harness compacts the conversation less often.

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

Maya has the agent hand a search to a sub-agent: find every place in the repository that calls the function under test. The sub-agent reads 200 files. What is added to the main session’s context?

A. Every file the sub-agent read, in full
B. The sub-agent’s full transcript, including its tool calls
C. Nothing; the results are shown only to Maya
D. The sub-agent’s final report of what it found

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

Late in a long session, the harness compacts the conversation to free up context. Afterward, which of these is still in the agent’s context in full?

A. Maya’s first message
B. The ticket text returned by the tracker tool
C. The agent’s earlier replies in the chat
D. The build command in the instruction file

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

Last week, Maya told the agent in chat that code in `legacy/` is deprecated and shouldn’t be copied as an example. Today, in a new session, the agent copies a pattern from `legacy/` into a new file. What explains this, and what addresses it?

A. Chat doesn’t carry into a new session; add the guidance to the instruction file.
B. Compaction erased the message; repeat the guidance in chat each morning.
C. Nothing enforced the rule; add a lint rule that rejects imports from `legacy/`.
D. No skill covered it; add one described as “Use when working in `legacy/`.”

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

Which statement describes what the model does when the agent reads PLAT-112?

A. It sends a request straight to the tracker’s API.
B. It outputs a tool request, which the harness carries out.
C. It writes the ticket text from what it learned in training.
D. It runs the tool’s code itself, then reads the output.

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

The instruction file says “Every commit message must include a ticket ID,” but some of the agent’s commits still leave it out. Which change guarantees the rule is followed?

A. Move the rule to the top of the instruction file and explain why it matters.
B. Have a sub-agent review every commit message first.
C. Add the rule to a skill that loads whenever the agent commits.
D. Add a hook that rejects commits without a ticket ID.

__Suggested Answers__

- A
- B
- C
- D

__Practice Question__

The team adds a lint rule that reports any import from `legacy/`, and the test command runs the linter. The agent writes an import from `legacy/` and runs the tests. What happens next?

A. The agent doesn’t see the error; lint output goes only to CI.
B. The failed run stops the session until Maya intervenes.
C. The error is returned to the model, which can fix the import.
D. The harness rewrites the import using the linter’s suggestion.

__Suggested Answers__

- A
- B
- C
- D




