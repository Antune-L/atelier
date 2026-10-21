<!-- NOTE(ali): derived once from the argus-review methodology (references/dimensions.md, section "logic", snapshot of 2026-10-21) referenced by the helios-daily-audit skill; the audit method is now owned by the app. -->
**Owns:** business-logic correctness (class `business_logic`): does the range implement what each
change intends, and does it respect the domain's invariants?

**Intent sources** are the commit messages and pull request descriptions below. They are
authoritative and exhaustive: never infer intent beyond them or import domain knowledge from outside
the repository. When they are empty, restrict yourself to internal-consistency checks (items 3 to 6).

1. **Intent coverage.** Map each requirement stated in the intent sources to the code that implements
   it. Flag code whose behavior **contradicts** a stated requirement, and a material requirement with
   no implementing code. **Quote the contradicted sentence verbatim** in `expectedSource`; re-read it,
   do not paraphrase from memory. **Inverse check:** if an intent source mandates the implemented
   behavior, it is not a defect on that basis.
2. **Scope drift.** Behavior the range ships that no intent source asked for and that changes a
   user-visible rule (a new restriction, an altered default) is a finding only when it has a
   demonstrated consequence and conflicts with an applicable expectation.
3. **State transitions.** For any status or state enum the range touches: are all transitions the
   code allows valid in the domain? Are all existing states handled in the new `switch` or `if`
   chains the range itself adds? (A new state whose pre-existing consumers were not updated belongs
   to the regression lens.)
4. **Calculations and units.** Money, quantities, percentages and dates the range computes: rounding
   mode and place, cents and units conversions, inclusive or exclusive boundaries (`<` versus `<=` on
   an end date), timezone-sensitive comparisons, division by a value that can be zero in the domain.
5. **Role and permission rules.** When an intent source states a role or ownership rule, is it
   enforced on both sides (a backend filter the frontend also respects, and the reverse), with the
   same predicate rather than two hand-written variants that can drift?
6. **Cross-layer rule coherence.** The same business rule expressed twice (schema bound versus
   database constraint versus UI validation, a query filter versus a component filter): flag when
   the range changes one expression and not the others. Cite both `file:line`.
7. **Bug fixes.** When an intent source describes a bug being fixed, verify that the fix covers the
   whole symptom class and not only the reported instance; a reachable remaining instance is a
   finding.
8. **Third-party contract semantics.** When correctness rests on what a library or external API
   actually does, cite its source or documentation available in the worktree, both to flag and to
   pass; "mirrors the existing pattern" is not evidence. Unverifiable: drop.

For invariants (items 3 to 6), the establishing evidence is a sibling `file:line` (the enum
definition, the other side of the contract, the duplicated rule); open files outside the diff for
this context.

Ignore: technical edge cases with no domain meaning, consumer blast radius, security exploits and
plain missing auth guards, style.

Severity: `critical` when the range ships high-impact behavior that contradicts a stated requirement
or breaks a domain invariant (wrong calculation, invalid transition, rule enforced on one side only)
for a main journey; `warning` for a narrower reachable path. Before flagging a missing uniqueness,
integrity or atomicity guard, search the schema for an enforcing constraint (unique index, foreign
key): a database-enforced invariant is not a missing application check. A pure refactoring with no
intent source and no broken behavior yields zero findings.
