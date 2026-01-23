__Type__

Text Input

__Practice Question__

What is the capital of France? (Accept any case variation)

__Correct Answers__

- Paris [kind: string] [options: caseSensitive=false,fuzzy=false]

__Practice Question__

What is the approximate value of π? (Accept values within 0.1)

__Correct Answers__

- 3.14 [kind: numeric] [options: threshold=0.1,precision=2]

__Practice Question__

How many kilograms are in 1000 grams? (Include unit)

__Correct Answers__

- 1 kg [kind: numeric-with-units] [options: threshold=0.01,precision=2,units=kg,g]

__Practice Question__

What is the famous programming principle that states "Don't Repeat Yourself"? (Accept variations with punctuation, spacing, and minor spelling errors)

__Correct Answers__

- Don't Repeat Yourself [kind: string] [options: caseSensitive=false,fuzzy=true]

__Practice Question__

Spell the word "accommodation" (Accept minor spelling errors)

__Correct Answers__

- accommodation [kind: string] [options: caseSensitive=false,fuzzy=0.7]

__Practice Question__

What is the price of a coffee? (Enter amount in dollars)

__Correct Answers__

- 4.50 [kind: numeric-with-currency] [options: threshold=0.01,precision=2,currency=$]

__Practice Question__

Describe your approach to solving this problem. (This will be reviewed later and is not part of the score)

__Correct Answers__

- [kind: validate-later]
