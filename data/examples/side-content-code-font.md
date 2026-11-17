__Type__

Text Input

__Content__

[contentWidth: 60%]

[designSystem]

## Block header

<p>rootHash = <span class="code-medium">e10a8dbe31fe0b8c1f366a4d2e4e752906d89c066edd62fc37e157483b65f6d0</span></p>
<p>difficulty = <span class="code-medium">1</span></p>

A nonce is valid when the SHA-256 hash of `rootHash + nonce` starts with `difficulty` zeros.

__Heading__

The hash and the difficulty use the design system's code-medium class, set in JetBrains Mono. While that font loads, they show in a fallback monospace font; they are never blank. To check, open DevTools, tick Disable cache, choose Slow 3G throttling, and reload.

__Practice Question__

What is the difficulty of this block?

__Correct Answers__

- 1 [kind: numeric] [options: precision=0,threshold=0]
