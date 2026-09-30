# DiffiMax

## A Minimax-Based Chess Trap Finder

DiffiMax is a chess-search method built on top of minimax.

It retains the normal engine principle of searching for the opponent's best response, but additionally examines the opponent's **alternative responses** to identify positions where a player can be induced into making a sufficiently damaging mistake.

The central question is:

> **How much does the position deteriorate when the opponent chooses a plausible alternative to their best move?**

DiffiMax is therefore not intended to replace minimax. It adds **opponent-response analysis** to normal search.

---

# Minimax vs DiffiMax

Standard minimax asks:

> What happens if both players choose their best moves?

At an opponent node:

```text
Opponent's legal moves
        │
        ├── Move A → -0.2
        ├── Move B → +1.8
        ├── Move C → +2.1
        └── Move D → +2.4
```

If evaluations are from our perspective, the opponent chooses:

```text
-0.2
```

because that is best for them.

Minimax therefore returns:

```text
-0.2
```

DiffiMax additionally asks:

```text
How much worse are the opponent's alternatives?
```

If Move B is a plausible alternative:

```text
Best response       -0.2
Alternative         +1.8
Dip                  2.0
```

DiffiMax can identify this as a potential trap.

---

# The DiffiMax Model

At an opponent node, let the meaningful responses be ordered by objective strength:

$$
v_1,v_2,v_3,\ldots,v_n
$$

where \(v_1\) is the opponent's best response.

DiffiMax does **not** simply assume that the opponent will play \(v_2\).

Instead it evaluates the response distribution and determines whether one or more alternatives are sufficiently close to the best move to be considered plausible, while still producing a sufficiently large deterioration.

---

# Response Scope

The user can control how broadly the opponent's responses are considered:

```text
2   3   4   5   All
```

For Top-\(k\):

$$
R_k=\{v_1,\ldots,v_k\}
$$

For All:

$$
R_{\text{all}}=\{v_1,\ldots,v_n\}
$$

This controls the breadth of the trap analysis.

### Top 2

Examines the opponent's strongest alternative to their best move.

### Top 3

Examines the two strongest alternatives.

### Top 4

Examines the three strongest alternatives.

### Top 5

Examines a broader set of strong responses.

### All

Examines the complete meaningful response distribution.

For All, the interface can additionally display:

$$
\operatorname{mean}(R)
$$

$$
\operatorname{median}(R)
$$

and:

$$
\max(R)-\min(R)
$$

---

# Reasonable Player Dip

The **reasonable-player dip** determines how far a move may fall from the opponent's best response while still being considered a plausible alternative.

Let:

$$
v_1
$$

be the opponent's best evaluation and:

$$
v_i
$$

be an alternative.

Define the opponent's deterioration as:

$$
\Delta_i=v_i-v_1
$$

when evaluations are from our perspective.

A response is considered reasonable when:

$$
\Delta_i\leq\epsilon_R
$$

where:

$$
\epsilon_R=\text{reasonable player dip}
$$

Example:

```text
Best response       -0.2
Alternative         +1.1
Dip                  1.3

Reasonable dip       2.0
```

The alternative remains inside the configured reasonable range.

---

# Trap Dip Threshold

The **trap dip threshold** determines how large the deterioration must be before the alternative is classified as a trap candidate.

A response qualifies when:

$$
\Delta_i\geq\epsilon_T
$$

where:

$$
\epsilon_T=\text{trap dip threshold}
$$

Therefore the basic trap interval is:

$$
\boxed{
\epsilon_T
\leq
\Delta_i
\leq
\epsilon_R
}
$$

This is important.

A move that is catastrophically bad is not automatically a DiffiMax trap.

DiffiMax is looking for a move that is:

1. sufficiently close to the best response to be considered plausible; and
2. sufficiently worse to create a meaningful consequence.

---

# Example

Suppose the opponent's responses evaluate as:

```text
Best     -0.2
2nd      +1.1
3rd      +1.7
4th      +3.2
5th      +4.0
```

Set:

```text
Reasonable player dip = 2.0
Trap dip threshold     = 1.0
```

Then:

```text
2nd response:
    dip = 1.3
    reasonable = YES
    trap threshold = YES

3rd response:
    dip = 1.9
    reasonable = YES
    trap threshold = YES

4th response:
    dip = 3.4
    reasonable = NO

5th response:
    dip = 4.2
    reasonable = NO
```

DiffiMax identifies the second and third responses as the relevant trap candidates.

---

# Forced Responses

DiffiMax must distinguish a trap from a position where the opponent simply has no meaningful choice.

The process is:

```text
Legal responses
       │
       ▼
Remove forced / excluded responses
       │
       ▼
Meaningful responses
       │
       ├── 0 or 1
       │      │
       │      ▼
       │   No trap
       │
       ▼
Sort by objective evaluation
       │
       ▼
Apply response scope
       │
       ▼
Find reasonable alternatives
       │
       ▼
Apply trap-dip threshold
```

If fewer than two meaningful responses remain:

$$
|R|<2
$$

the position is not classified as a trap.

The search nevertheless continues normally.

---

# Normal Tree Traversal

Trap detection does **not** terminate the search.

This is a critical property of DiffiMax.

At every position the search continues through the tree just as a chess engine would.

```text
                    Position
                       │
                 normal search
                       │
              ┌────────┴────────┐
              │                 │
           Your turn       Opponent turn
              │                 │
          minimax choice   response analysis
                                │
                         ┌──────┴──────┐
                         │             │
                       Trap          No trap
                         │             │
                         ▼             ▼
                   record trap    normal minimax
                         │             │
                         └──────┬──────┘
                                │
                                ▼
                         continue search
```

If no trap is found at the current node, DiffiMax simply proceeds with normal minimax.

If a trap is found, the trap is recorded and its alternative continuation can be explored.

Therefore DiffiMax searches for traps **throughout the tree**, rather than stopping after examining only the initial opponent response.

---

# Search Depth

DiffiMax has a normal search depth:

$$
D
$$

The deeper the search, the further down the game tree potential traps can be detected.

In a chess implementation, the underlying search can use:

* minimax;
* alpha-beta pruning;
* iterative deepening;
* transposition tables;
* a conventional chess evaluation function;
* or an external chess engine.

DiffiMax is the **response-analysis layer** on top of that search.

---

# Settings

The important user-facing settings are:

| Setting                   | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| **Search Depth**          | How far the search traverses                                   |
| **Opponent Responses**    | Top 2, 3, 4, 5, or All                                         |
| **Reasonable Player Dip** | Maximum deterioration still considered a plausible alternative |
| **Trap Dip Threshold**    | Minimum deterioration required to identify a trap              |
| **Exclude Checks**        | Ignore checking responses during trap analysis                 |
| **Exclude Captures**      | Ignore capturing responses during trap analysis                |

The original prototype also had a minimum branching condition of 10. In the revised algorithm this should not be treated as a fundamental constant. The meaningful-response filter and response-scope control provide a more explicit way to handle the same problem.

---

# Evaluation Display

A chess implementation should expose the actual evaluations used by the algorithm.

For example:

```text
Position
--------
FEN: ...
Side to move: Black

Engine evaluation: +0.4

Opponent responses
------------------

1. ...Move A       +0.4
2. ...Move B       +1.8
3. ...Move C       +2.1
4. ...Move D       +3.0
5. ...Move E       +4.2

Best response:       ...Move A
Trap candidate:      ...Move B

Evaluation dip:       1.4
Reasonable limit:     2.0
Trap threshold:       1.0
```

This makes the reason for the DiffiMax result directly inspectable.

---

# Response Distribution

The response values can also be visualized:

```text
Opponent responses

Best     +0.4  ████████████████████
2nd      +1.8  █████████████████
3rd      +2.1  ███████████████
4th      +3.0  ███████████
5th      +4.2  █████
```

The important quantity is not simply the absolute evaluation.

It is the **shape of the response distribution**.

A large separation between the strongest response and several plausible alternatives is exactly the structure DiffiMax is designed to expose.

---

# Original Prototype

The first DiffiMax prototype used a randomly generated tree and hard-coded conditions.

Its principal parameters were:

```text
drawThresh = 1.25
winThresh  = 2
```

and it required:

```text
at least 10 children
```

It compared the opponent's best and second-best moves and substituted the second-best move when the trap conditions were satisfied.

The revised implementation generalizes this mechanism by making the response breadth and evaluation-dip criteria explicit.

The underlying idea remains the same:

$$
\boxed{
\text{Best opponent response}
\quad\text{vs}\quad
\text{inferior alternative}
}
$$

---

# DiffiMax in One Formula

The core trap condition can be summarized as:

$$
\boxed{
\exists v_i\in R_k:
\quad
\epsilon_T
\le
(v_i-v_1)
\le
\epsilon_R
}
$$

subject to:

$$
|R|\ge2
$$

and any configured tactical exclusions.

In words:

> There is an opponent response within the configured range of plausible play that nevertheless produces a sufficiently large deterioration from the opponent's best response.

---

# What DiffiMax Is Trying to Find

Minimax identifies:

$$
\boxed{\text{Best play}}
$$

DiffiMax additionally identifies:

$$
\boxed{\text{Vulnerable alternative play}}
$$

The purpose is not to claim that the opponent will make a mistake.

The purpose is to identify positions where:

$$
\text{best defense}
\rightarrow
\text{safe}
$$

while:

$$
\text{plausible alternative}
\rightarrow
\text{significant deterioration}.
$$

That is the structure DiffiMax calls a **trap candidate**.

---

# Status

DiffiMax is an experimental search method.

Its effectiveness should be evaluated empirically against real chess positions and engine analysis.

The important experimental variables are:

* search depth;
* response scope;
* reasonable-player dip;
* trap-dip threshold;
* position type;
* evaluation stability;
* and the frequency with which detected trap candidates correspond to practical chess traps.

The algorithm does not claim that these parameters constitute a model of human chess decision-making. They are controls for exploring how the relationship between **best response, alternative responses, and evaluation deterioration** affects trap detection.
