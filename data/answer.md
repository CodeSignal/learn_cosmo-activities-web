__Type__

Text Input

__Summary__

1/6 correct

__Responses__

1. **Question 1**
   - Selected Answer: No answer selected
   - Correct Answer: Paris
   - Result: ✗ Incorrect

2. **Question 2**
   - Selected Answer: No answer selected
   - Correct Answer: 3.14
   - Result: ✗ Incorrect

3. **Question 3**
   - Selected Answer: No answer selected
   - Correct Answer: 1 kg
   - Result: ✗ Incorrect

4. **Question 4**
   - Selected Answer: No answer selected
   - Correct Answer: Don't Repeat Yourself
   - Result: ✗ Incorrect

5. **Question 5**
   - Selected Answer: acc
   - Correct Answer: accommodation
   - Result: ✗ Incorrect

6. **Question 6**
   - Selected Answer: 4,5
   - Correct Answer: 4.5
   - Result: ✓ Correct

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

- 1 kg [kind: numeric-with-units] [options: threshold=0.01,precision=2,units=kg]

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

- 4.5 [kind: numeric-with-currency] [options: threshold=0.1,precision=1,currency=$]

