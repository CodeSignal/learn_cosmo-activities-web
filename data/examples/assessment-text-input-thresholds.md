__Type__

Text Input

__Heading__

A numeric answer is correct when it is within `threshold` of the key, inclusive. To check the boundary, enter `0.31` and `2.6`: each is exactly one threshold from its key and is graded Correct. `0.32` and `2.7` are graded Incorrect. The last question is reviewed later, so it gets no row in the score.

__Practice Question__

Marketing spend was $30,000 out of $100,000 in revenue. What share of revenue is marketing, as a decimal? Answers within 0.01 are accepted.

__Correct Answers__

- [kind: numeric] [options: precision=2,threshold=0.01]

__Practice Question__

A bus ticket costs $2.50. How much is it in dollars? Answers within $0.10 are accepted.

__Correct Answers__

- [kind: numeric-with-currency] [options: precision=2,threshold=0.1,currency=$]

__Practice Question__

Explain how you worked out the marketing share.

__Correct Answers__

- [kind: string] [options: multiLine=true]
