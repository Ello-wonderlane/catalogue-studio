# Final review — POS Specification v2.0

**Reviewing:** PR #3, `docs/product-operating-system.md` v2.0
**Stance:** five perspectives, not defending the document.
**Scope discipline:** only issues that would require changing the specification
before implementation. Things that could merely be nicer are excluded.

**Recommendation: APPROVE WITH MINOR AMENDMENTS.** Six amendments, listed in §6.
None requires re-architecting. One is not cosmetic: the specification claims to
own inventory and has no path to hear about a sale.

---

## 1. Chief Architect

### 1.1 Inventory authority is duplicated with the commerce engine — the one serious finding

§1.1 gives the POS "Inventory — Quantity per SKU". §8 makes Shopify the commerce
engine for the direct channel, and Shopify must hold stock of its own to block
oversell at checkout. So both systems hold a quantity for the same SKU.

Contract 2 accepts "external id, listing status, error, last-pushed hash" — **not
stock movements**. There is no inbound path for "one unit sold". The POS number
is therefore wrong from the first order and diverges permanently.

This is precisely the duplicated authority §1.2 exists to prevent, and it sits on
the one field where being wrong costs money directly. It is also not solvable by
saying the POS is authoritative: the commerce engine physically cannot ask
permission mid-checkout.

**Required change:** either extend Contract 2 to accept stock movements from a
commerce engine (POS holds the master count, receives decrements), or state that
realtime stock for a channel is owned by that channel and the POS owns the
replenishment count with a reconciliation direction. Either is a paragraph.
Leaving it unstated means whoever implements it guesses, and the guess is
load-bearing.

### 1.2 Cost is specified twice, incompatibly

§2.1 lists `sku` as owning "cost, MRP, selling price" — a field. §6 says "Cost is
a series, not a scalar… Cost carries an effective date."

These cannot both be built. The second is correct and was a v1 review finding,
but it changes the entity count from fourteen to fifteen, and §2.5's table does
not include it. **Resolve the contradiction and update the entity list.**

### 1.3 Status does not compose over bundles

§7 puts four states on the product. §2.2 makes bundle components SKUs that may be
`is_sellable = false` — and every SKU belongs to a product.

A component's product will never reach `ready` or `live`, because it is never
listed. Yet the bundle that contains it must be `live`. The specification says
nothing about how a bundle's readiness relates to its components' product status,
so validation will either block live bundles or ignore components entirely.

**Required change:** one rule stating that a bundle's readiness considers its
components' *data completeness* but not their product status, and that
non-sellable products are exempt from the `ready` transition.

### 1.4 Migration risk the phases do not cover: saved custom formats break

`FormatBuilder` stores each mapped column as a **`FIELDS` key** —
`cols[].map = "imageUrl2"`, `"about"`, `"weightUnit"`. These are saved per
marketplace format and are user-created work.

Phase 6 moves images into `asset`. Phase 7 drops computed columns and applies
unit conventions (abolishing `weight_unit`). Phase 8 moves bag attributes.
**Every saved custom format referencing those keys silently stops resolving** —
the export produces blank columns rather than an error, because an unmapped
column is a legitimate state in that builder.

This is the only user-authored data in the system that migration does not
address, and the failure is silent. **Required change:** a phase step that
rewrites saved format mappings, or a compatibility alias table from old field
keys to new paths.

### 1.5 Unnecessary complexity — nothing further to cut

I looked for remaining theatre and did not find any worth reporting. `supplier`
is thin with one supplier, but manufacturing defers to it and the SKU-prefix rule
needs a home. `channel_listing` before an API channel is justified: file channels
still return ASINs and style IDs that must be recorded somewhere.

### 1.6 Bundle products are undefined

A bundle SKU needs a `product_id` (it is in the natural key). Its product would
own "product dimensions, net weight, material" — all meaningless for a kit of
five different items. Not a flaw in the model, but an ambiguity a developer hits
on day one. **One sentence: for bundle products, product-level physical
attributes are not applicable; the shipped carton lives on the SKU.**

---

## 2. Product Manager

### 2.1 Price is classed channel-shaped with no mechanism

§6 lists price under **channel-shaped** — "one source, many renderings". §2.1
gives the SKU one selling price. §12 defers per-channel pricing "until a channel
forces a different price than another."

The trigger is correct, but marketplace commissions differ by roughly fifteen to
thirty per cent between Meesho and Myntra, so the trigger fires the moment the
second marketplace goes live, not at some distant point. The inconsistency is
that §6 already classifies price as needing per-channel rendering while the model
has no field for it.

**Required change:** small. Either move price out of the channel-shaped class
until the mechanism exists, or state the per-channel price override now as a
nullable field. Do not build price lists.

### 2.2 Returns are deferred behind a trigger that fires immediately

§4 defers stock condition and returns disposition, with the trigger "the week
marketplace returns start arriving."

Indian marketplace fashion sees high return rates as a baseline, not an
exception. The trigger therefore fires in week one of marketplace selling, which
means this is not deferred — it is unplanned. The fix is small (a `condition`
value on the quantity), and the specification is right not to build a disposition
workflow.

**Required change:** tighten the trigger to "before the first marketplace
listing goes live" so it is not discovered as a surprise.

### 2.3 Missing capability I did *not* flag

I considered demand and reorder visibility, supplier purchase orders, and
customer-facing analytics. All are correctly out of scope or deferred. No further
business capability is missing for the first 200 SKUs.

---

## 3. Marketplace expert — publication readiness

| Channel | Ready? | Blocking issue |
|---|---|---|
| Shopify | Conditional | Option-count ceiling, §3.1 |
| Amazon | Conditional | GTIN, already an open question |
| Myntra | Yes | — |
| Flipkart | Yes | — |
| Meesho | Yes | — |
| **ONDC** | **No** | A statutory field was deleted, §3.2 |

### 3.1 The natural key can describe a product Shopify cannot publish

POS-7's natural key is `(product, colour, colour_secondary, finish, size,
pack_type)` — five variant dimensions. Shopify permits **three options per
product**. A product varying on four or more of those dimensions is unpublishable
to Shopify, and the specification permits creating one.

Today's catalogue varies by colour alone, so nothing is broken now. But the
specification is the thing that prevents future mistakes, and it currently allows
a product that cannot be listed on the channel §8 names first.

**Required change:** state the constraint — a product MUST NOT vary on more than
three dimensions if Shopify is a target channel — and verify the current Shopify
option limit before relying on the number.

### 3.2 `manufacture_month_year` was removed, and ONDC needs it

§5 deliberately omits it, reasoning that v1 placed it on a 1:1 record so a SKU
could hold only one date, and that "the declaration is printed from the
production record, not stored here."

**There is no production record.** It is deferred in the same document. So the
field exists nowhere, and month-and-year of manufacture or pre-packing is part of
the Legal Metrology declaration set that ONDC transmits as its statutory block.

The v1 objection was valid but the remedy overshot: the correct fix was to keep
one date per SKU — which is what a small brand declares in practice — and defer
*batches* separately. Deleting the field to avoid modelling batches removed a
declaration that is legally required.

**Required change:** restore `manufacture_month_year` on the SKU as a single
value. Keep batches deferred. Confirm the exact ONDC field name and the Legal
Metrology wording with a compliance adviser before launch, as §5 already
requires.

### 3.3 Amazon GTIN

Already captured as §16 question 2 and correctly framed as a business decision.
Noted here only so the readiness table is complete: without GTIN or a recorded
exemption, Amazon publication fails. No specification change needed.

### 3.4 Amazon bullets — checked, not an issue

v1 noted that Amazon takes five bullets while the model held four. v2 merged copy
into product fields without stating a bullet count. Since five is Amazon's
maximum rather than a minimum, this does not prevent publication. Not reported as
a required change.

---

## 4. Small-team operator — two people

### 4.1 Bundle modelling should be conditional on separate stocking

To sell one combo under §2.2, an operator must create five component SKUs — each
needing a product, a category and dimensions — before the bundle exists. For four
combos sharing components that is a one-time cost, but it is data entry whose
only purpose is inventory correctness.

**If the combo arrives from the supplier as a sealed unit, the components are
never stocked separately and none of that work has any value.** The specification
mandates `kind = bundle` for all eight kits regardless.

**Required change:** make bundle decomposition conditional — a kit is modelled as
a bundle **only when its components are separately stocked or separately sold**.
Otherwise it is a simple SKU whose contents are descriptive text, which is what
today's model already does correctly. This is the difference between roughly ten
extra records and zero for a two-person team, and §16 question 1 already asks the
question that decides it.

### 4.2 Everything else is proportionate

Four workflow states with no approvals, no role model, self-service `ready`, and
validation that reports rather than gates: this is the right weight. Ten
migration phases is a lot of sequencing, but each has an acceptance test and
phases 2–8 are invisible to users. I found no other unnecessary burden worth
reporting.

---

## 5. Future scale — 5,000+ SKUs

### 5.1 The SKU grammar has a hard ceiling that binds before 5,000

Ratified in §2.4: material is **one character**, colour is **two**.

One character gives twenty-six materials. The registry already holds twelve, and
the taxonomy in the same repository covers bags, apparel, footwear and
accessories — cotton, linen, silk, wool, viscose, polyester, nylon, leather,
suede, PU, canvas, jute, denim, velvet, rubber, metal, mesh, satin, georgette,
crepe, rayon, modal and more. **Twenty-six is exceeded well before 5,000 SKUs**,
and POS-9 forbids auto-generating a code, so there is no escape valve.

Two-character colours are less tight but the same shape of problem, and POS-9
requires a human to invent each one.

This is survivable, and only because of a v2 change: POS-11 made decoding
best-effort, so a catalogue containing two grammar generations is tolerable —
which the in-app SKU rule already supports ("existing SKUs don't change; new ones
follow the new rule").

**Required change:** state the ceiling and the expansion path — material widens
to two characters for new issue when the registry approaches twenty-six, old SKUs
unchanged, decoding remains best-effort. One paragraph. Without it, someone hits
this at 400 materials-worth of catalogue and treats it as an emergency.

### 5.2 Checked and adequate

- Server-side paging trigger at 500 SKUs — stated (§10).
- Storage threshold at 700 MB — stated, and fires around 600 SKUs at three
  originals each, well before 5,000.
- Event log retention at 24 months — stated.
- Natural-key uniqueness, bundle availability computation, and hash-based feed
  skipping all behave at 5,000.
- Style number is four digits per brand and category — 9,999 per combination.
  Adequate.

Nothing else fundamentally breaks.

---

## 6. Recommendation

### APPROVE WITH MINOR AMENDMENTS

The architecture is sound and no part of it needs redesigning. Six amendments,
none structural:

| # | Amendment | Source |
|---|---|---|
| 1 | **Inventory reconciliation.** Extend Contract 2 to accept stock movements, or state channel-owned realtime stock with a reconciliation direction. | §1.1 |
| 2 | **Restore `manufacture_month_year`** on the SKU as a single value; keep batches deferred. | §3.2 |
| 3 | **Resolve the cost contradiction** — series, not field — and update the entity list to fifteen. | §1.2 |
| 4 | **Bundle rules:** decomposition only when components are separately stocked; bundle readiness ignores component product status; bundle products have no product-level physical attributes. | §1.3, §1.6, §4.1 |
| 5 | **Add two constraints:** no more than three variant dimensions where Shopify is a target; state the material-code ceiling and its expansion path. | §3.1, §5.1 |
| 6 | **Cover saved custom formats in migration**, and tighten the returns trigger to "before the first marketplace listing". | §1.4, §2.2 |

Amendments 1 and 2 should be made before approval, because one concerns
duplicated authority over money and the other blocks a named channel. The rest
can be folded in as the phases reach them.

### Decisions that genuinely require business input

Only these. Everything else is settled or deliberately open.

1. **Are the kit components separately stocked or sold?** Decides whether the
   eight kits are bundles or simple SKUs, and whether roughly ten extra records
   exist at all. Amendment 4 depends on the answer.
2. **Do you hold GS1 membership, or will you seek marketplace GTIN exemptions?**
   Decides whether GTIN can be required, and gates Amazon and ONDC.
3. **Who owns stock at the moment of sale — the POS or the commerce engine?**
   Amendment 1 needs the direction; the mechanism follows from it. This is an
   operating decision, not a technical one.
4. **When storage passes 700 MB, where do originals go?** R2, B2, or paid
   Supabase. A cost decision.
5. **Which channel is genuinely first?** §8 argues Shopify on model fit. If
   revenue is arriving from a marketplace, the sequence should follow the money
   and the existing spreadsheet contract may suffice for a long time.
6. **The fourteen pending amendments in §13** still need accept or reject,
   independently of this review.
