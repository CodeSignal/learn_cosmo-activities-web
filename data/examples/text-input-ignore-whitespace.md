__Type__

Text Input

__Heading__

When `ignoreWhitespace=true`, answers are compared after removing **all** whitespace, so expressions like `s+3` and `s + 3` match. The default is `ignoreWhitespace=false` (strict spacing).

__Practice Question__

Simplify: if the sum of a term `s` and three is written as an expression, how would you write **s plus 3** using symbols (for example `s+3` or `s + 3`)?

__Correct Answers__

- s+3 [kind: string] [options: caseSensitive=false,ignoreWhitespace=true]
- 3+s [kind: string] [options: caseSensitive=false,ignoreWhitespace=true]

__Practice Question__

This question keeps the default: spacing must match exactly. `x = 1`

__Correct Answers__

- x = 1 [kind: string] [options: caseSensitive=true,fuzzy=false,ignoreWhitespace=false]
