# Architecture review — POS Specification v1.0

**Reviewing:** PR #3, `docs/product-operating-system.md`
**Stance:** adversarial. The reviewer did not write the proposal and is not
defending it.
**Question:** does this survive ten years and 1000+ SKUs?

**Verdict: do not approve as written.** Four blocking defects, one of which
breaks the system's own founding principle against data that exists today.
The layered structure and the ownership register are sound and should survive.
Roughly a third of the entity model should be deleted or merged before anyone
builds against it.

---

## Severity summary

| # | Finding | Severity |
|---|---|---|
| B1 | One third of the live catalogue is a bundle. The spec has no bundle concept, and this violates "every SKU exists exactly once". | **Blocker** |
| B2 | "Every SKU exists exactly once" has no enforcement mechanism. The uniqueness asserted is on the wrong key. | **Blocker** |
| B3 | SKU generation can silently emit a duplicate, and collision-dodging corrupts the style grouping the migration depends on. | **Blocker** |
| B4 | The image strategy exceeds the free-tier storage constraint at roughly 200 SKUs, not 1000. | **Blocker** |
| M1 | The workflow is unimplementable: it names five roles against a system with two. | Major |
| M2 | `cost_landing` as a scalar on variant makes margin wrong at the second purchase order. | Major |
| M3 | `flatView` is mandated permanently with no deprecation path — the migration bridge becomes the new legacy. | Major |
| M4 | Identity is coupled to mutable business taxonomy, and POS-4.2 freezes that coupling forever. | Major |
| M5 | `payload_hash` is defined two different ways, and either way conflates data change with mapping change. | Major |
| M6 | Product/Style/Variant is over-built by the spec's own test. | Major |
| M7 | No returns or stock-condition model. Indian fashion returns heavily. | Major |
| M8 | Statutory `manufacture_month_year` points at a batch concept that does not exist. | Major |
| M9 | POS-11.3 forbids the code that fixes the broken backup. | Major |
| m1–m7 | Over-engineering, missing size system, tax model, index strategy, override auditability, event-log growth, GTIN required. | Minor |

---

## Blocking findings

### B1 — One third of the catalogue is a bundle, and the model has no bundles

This is the most serious finding, and it is not hypothetical.

```
YSWHAC0024CO  pack of 5  1 Tote Bag, 1 Sling Bag, 1 Wristlet, 1 Mobile case, 1 Card Holder
YSWHAC0024B1  pack of 5  (same)
YSWHAC0024GY  pack of 5  (same)
YSWHAC0024CB  pack of 5  (same)
YSWTO0084PBE  pack of 2  1 Tote Bag, 1 Multi-purpose Pouch
YSWTO0084PCW  pack of 2  (same)
YSWTO0084PCB  pack of 2  (same)
YSWTO0084PBK  pack of 2  (same)
```

Eight of twenty-four products — **one third** — are kits containing other
sellable items. The spec models them as ordinary variants with a `pack_type`
and a free-text `contents` array.

Two outcomes, both wrong:

1. If the component items are never variants, then a sling bag sold inside a
   combo does not exist in the POS. Selling the combo decrements nothing.
   Inventory is fiction the moment a combo ships.
2. If the component items *are* variants — and they must be, because a sling
   bag is a sellable unit with a SKU under the existing category `SL` — then the
   sling exists twice: once standalone, once inside `YSWHAC0024CB`. **That is a
   direct violation of OD-2, "every SKU exists exactly once", and the spec
   asserts OD-2 while shipping the violation.**

`contents` as `text[]` is the tell. It is a bill of materials written as prose
so that nothing has to reference anything. The spec even lists "Manufacturing ·
BOM" as an owned domain and then defers it, without noticing that a third of
the current catalogue already needs it — not for manufacturing, but for
*inventory correctness on things being sold today*.

**Required:** a `bundle_component` relation — parent variant, child variant,
quantity — and a variant `kind` of `simple` or `bundle`. Inventory for a bundle
is computed from its components, never stored. `contents` becomes generated from
the relation, not authored.

This also resolves a contradiction the spec creates on its own: `packaging` is
1:1 with variant and carries `net_quantity`, `pack_type` *and* `contents`, so
three fields on one table describe a composition that has no structure.

### B2 — "Every SKU exists exactly once" is asserted, never enforced

OD-2 and I-1 are stated four times across the document. No constraint
implements them.

The spec makes `sku` unique. That is uniqueness of a *string*, not of a
*sellable unit*. Nothing prevents:

- two variants with identical (style, colour, size, finish, pack) and different
  SKUs — which is exactly the duplication that already exists in the live data,
  where colourways of one handbag are 24 independent top-level rows;
- the same physical product entered twice under two style numbers, each
  internally consistent.

The document diagnoses this failure in the current system and then reproduces
it, because it never states the natural key.

**Required:** a uniqueness constraint on the sellable tuple —
`(style_id, colour_id, colour_secondary_id, finish, size, pack_type)` — enforced
in the database, not the UI. Without it, "exactly once" is a slogan.

Related: the supplier mapping is **not injective**. `AB1234XYZ` and `ZZ1234XYZ`
both map to `YS1234XYZ`. The implementation detects the collision and *skips the
row* — meaning the second supplier's product silently has no record at all. In a
system of record, a skip is a lost product. This needs to be a hard error that
names both supplier codes, not a counter in a toast message.

### B3 — SKU generation can silently emit a duplicate, and collision-dodging corrupts the migration

Three defects compound, all in `src/lib/sku.js`, all ratified unchanged by
POS-4.2.

**Colour codes collide by construction.** `uniqueCode` falls back to
`"X" + (t.size % 10)` — modulo ten. After ten fallbacks it repeats a code it has
already issued.

**Material codes collide by construction.** `materialCodeOf` falls back to
`(p.material).slice(0, 1)`. "PU" and "Polyester" and "Patent" all yield `P`.

**The collision resolver corrupts style identity.** `ensureUniqueSku` resolves a
duplicate by incrementing the *style number* until the SKU is free. So a colour
collision is absorbed by pretending the variant belongs to a different style. The
SKU then encodes a style number that is not the product's style.

That last point invalidates the migration's central claim. Phase 2 groups
variants into styles by the decoded style number, and §9 calls this "the
enabling fact". If style numbers were ever bumped to dodge a colour or material
collision, the grouping silently splits one style into two, or merges two into
one, and the acceptance test — "variant count equals pre-migration product
count" — passes anyway because the count is unchanged. **The acceptance criterion
cannot detect the failure it most needs to catch.**

And the resolver gives up:

```js
while (takenSet.has(sku) && guard++ < 5000) { ... }
return { styleNo, sku };
```

After 5000 attempts it returns the colliding SKU with no error. A duplicate SKU
is written. I-1 is violated by the code the spec ratifies.

**Required:** (a) fix both code fallbacks to fail rather than collide; (b) the
guard MUST throw, never return; (c) phase 2's acceptance test MUST verify style
grouping against decoded segments *and* a physical-attribute check, not row
counts; (d) POS-4.2 must stop ratifying the grammar "unchanged" until this is
addressed.

### B4 — The image strategy breaks the free-tier constraint at ~200 SKUs

Free-tier-only is a standing business constraint. The spec never does the
arithmetic.

Per variant: one immutable original per role, plus four renditions each.

| SKUs | Originals @ ~500 KB, 5 roles | Renditions @ ~150 KB × 4 × 5 | Total |
|---|---|---|---|
| 200 | ~0.5 GB | ~0.6 GB | **~1.1 GB** |
| 1000 | ~2.5 GB | ~3.0 GB | **~5.5 GB** |

Supabase's free storage allowance is on the order of 1 GB. The strategy is
therefore already at the ceiling around **200 SKUs** — a fifth of the stated
target — and AMD-11's seven-year retention of originals makes it strictly
monotonic. Nothing in the spec ever deletes an original.

The spec compounds this by requiring originals "at the highest resolution
supplied" with no cap, and by putting `documents/` in the same project.

**Required:** decide storage economics before approval. Options, in the order I
would take them: cap original long-edge at 2500 px and re-encode to a stated
quality; generate renditions on demand at the CDN edge rather than storing four
per image; or move originals to an archive tier and accept that this breaks
free-tier-only, which is a business decision and therefore an amendment. Verify
current free-tier limits — they change — but the order of magnitude is not in
doubt.

---

## Major findings

### M1 — The workflow cannot be implemented

§6 names five owners: buyer/founder, merchandiser, photographer, copywriter,
brand owner. The system has two roles — `catalogue_users.role` defaults to
`editor`, and only `owner` is enforced anywhere, for user management. Every gate
in §6 is therefore unenforceable, and AMD-04 proposes making those gates
binding.

Either the role model is specified, or §6 is documentation rather than
architecture. It currently reads as the latter while claiming the former.

### M2 — `cost_landing` as a scalar makes margin wrong immediately

Landed cost changes per purchase order — different supplier, different freight,
different exchange rate, different duty. The spec puts one number on the
variant. The second PO at a different price silently overwrites the basis for
every historical margin figure, and `margin_pct` is a computed field with no
date, so past margins cannot be reconstructed.

This is a ten-year-horizon defect in a field the business has flagged as
sensitive. Cost belongs in a time-series keyed by variant, supplier and
effective date — the same shape the spec already accepts for `price`.

### M3 — `flatView` is permanent legacy, mandated by rule

POS-9.1 makes `flatView` mandatory and routes every adapter, export, health
check and screen through it. It returns "the current 50-key product shape".

There is no deprecation path anywhere in the document. So the 50-key legacy
shape — including the three computed-but-stored fields the spec elsewhere
abolishes — becomes a permanent published contract with at least seven
consumers. The bridge built to escape the flat row makes the flat row
load-bearing forever.

**Required:** `flatView` gets a removal version and a per-consumer migration
list, or it is explicitly accepted as the long-term internal API and the new
entity model is then honestly described as storage normalisation rather than a
new architecture.

### M4 — Identity is coupled to mutable taxonomy, and the coupling is frozen

The SKU embeds brand code, gender, category code, material code and colour code.
All five come from registries the spec keeps user-editable. POS-4.2 then
requires that `decodeSku` "MUST remain able to reverse any generated SKU".

Those two statements cannot both hold for ten years. Renaming a category,
re-coding a colour, or retiring a material breaks decoding of every SKU already
issued. The spec's own §4.6 demonstrates the failure — the registry and the
issued SKUs already disagree about `CO`.

A ten-year identifier should carry no mutable business meaning. The honest
options are: accept that decoding is best-effort and remove POS-4.2's MUST; or
version the registries so a SKU decodes against the registry *as it was at
issue*. The second is correct and costs a `registry_version` on the variant. The
spec chose neither and ratified the contradiction.

### M5 — `payload_hash` is defined twice, incompatibly

POS-5.5 says every generated artefact stores "a hash of its inputs". §4.1 of the
channel table and POS-7.5 say `payload_hash` is a "hash of the generated
payload". These are different values with different behaviour.

Hashing the *payload* means any adapter change — a bug fix, a budget tweak, a
reformat — re-pushes the entire catalogue. Hashing the *inputs* means a genuine
adapter fix never re-pushes, and stale payloads persist.

**Required:** hash inputs *and* record the mapping version, then re-push when
either changes. Pick one definition and use it consistently.

### M6 — Product/Style/Variant fails the spec's own over-engineering test

The document justifies three levels by "three audiences", then concedes all 24
products resolve 1:1, then defers Manufacturing and Repairs — the only
audiences that need the middle layer — to "out of scope until a product is
listed and selling".

So the layer is built for consumers the same document postpones. It adds a join
to every read, a second entity to every form, and a live ambiguity about which
level owns dimensions and attributes.

A nullable `style_group_id` on product, or construction fields on product with a
documented split trigger, serves today and splits cleanly later. Splitting an
entity is a migration; un-splitting one is a rewrite of everything that joined
it.

### M7 — No returns or stock-condition model

Indian marketplace fashion runs high return rates, and returned stock is not
equivalent to new stock. `inventory` has quantity, reserved and safety stock — no
condition, no disposition.

Within a year of going live there will be stock that is returned-sellable,
returned-damaged, awaiting repair, or written off, and the system will have one
number for all of it. `repair` is declared as an entity with no shape and no
consumer, which is where this belongs.

### M8 — A statutory field points at a concept that does not exist

`manufacture_month_year` is specified on `packaging` and annotated "per
production batch". `packaging` is 1:1 with `variant` (POS-3.2). A variant can
therefore hold exactly one manufacture date for all time.

Either there is a batch entity, or the field is wrong. Since this is a Legal
Metrology declaration, "wrong" has consequences beyond data quality.

### M9 — The approval rule forbids fixing the broken backup

POS-11.3: "No code may be written against this specification until it is
approved." Phase 0 of §9 is fixing `BACKUP_REPO_TOKEN` so backups stop silently
skipping. There is currently **no backup of anything** — the last three files
were deleted on 5 September and the automation has been inert.

As written, the constitution blocks the one change that protects the data the
constitution governs. Carve phase 0 out explicitly.

---

## Over-engineering — remove before building

| Concept | Why it should go or shrink |
|---|---|
| `copy` keyed by channel family × locale | Three dimensions of variation for content with one value, one brand, one language, one market. Keep versioning; drop the keying until a second locale exists. |
| `price_list` with validity windows | Solves scheduled promotions for a business with **no prices entered at all**. Keep the table, drop window resolution from v1. |
| Webhook fleet — seven event types | Built for consumers that are currently spreadsheets a human uploads. Keep the event log; add webhooks with the first API channel. |
| `document`, `repair`, `claim` as distinct entities | Three tables, one of which has no defined shape. Merge (below). |
| 52 rule identifiers | A constitution with 52 citable MUSTs for a two-person team will not be followed, and an unfollowed rule is worse than an absent one. Target ~15 binding rules; demote the rest to guidance. |
| `attribute_set` 1:1 with category | 95 categories implies 95 attribute sets. They need to be shareable and composable, or this is 95 copies of "has a strap". |

## Concepts that should be merged

- **`image` + `document` → `asset`** with a `kind`. Both are immutable
  originals with provenance, licence, approval, polymorphic owner. The spec
  writes a detailed eight-state lifecycle for one and none for the other.
- **`packaging` → `variant`.** Strictly 1:1, always. The justification given
  (I-6, "statutory describes the package") is a documentation argument dressed
  as a data-modelling one. Keep the field prefix; drop the join.
- **`claim` → `copy` + evidence reference**, or better, an assertion attached to
  the attribute it concerns. A claim about water resistance belongs next to the
  water-resistance attribute, not in a parallel table of sentences.
- **`price_list` + `price`** into one table with a nullable channel.

## Concepts that should be split

- **`cost` out of `variant`** — per M2, into a supplier × effective-date series.
- **`status`** — §6's seven-state product workflow and a variant's much smaller
  lifecycle are two state machines sharing one enum name. Split them.
- **`attributes jsonb`** — marketing, construction and channel-required
  attributes are mixed in one blob, so validation and channel mapping cannot
  address them separately.
- **`channel_listing.overrides jsonb`** — should be rows. POS-5.2 requires every
  override to carry a reason and be auditable; a JSON blob defeats exactly that.

---

## Scaling risks at 1000+ SKUs

Beyond B4, which bites first:

1. **Whole catalogue in client memory.** `loadAll()` fetches every product,
   every setting and 1000 history rows on each page load, then filters in React
   state. The audit flagged this and the spec deferred it. At 1000 variants
   across ~200 styles with media rows joined through `flatView`, this is the
   second thing to break. There is no pagination in the spec's read contracts
   for the *editor*, only for the API.
2. **`ensureUniqueSku` is O(n) per insert** with an in-memory taken-set and a
   5000-iteration ceiling. Dense style numbering at 1000+ SKUs makes the loop
   long and the silent-duplicate failure (B3) reachable.
3. **Settings single-row JSON.** The spec says decompose (POS-4.6) and then
   omits it from all nine migration phases. It is the highest-contention object
   in the system and nobody has been told to fix it.
4. **Event log unbounded.** Field-level diffs on every edit, 2000 retained in
   browser memory, no retention policy stated anywhere.
5. **First feed build.** Eight channels × 1000 variants is 8000 payloads with no
   stated execution environment. Hashing makes steady-state cheap and says
   nothing about the cold build or a mapping change that invalidates everything.
6. **No index strategy.** Tables are specified; indexes are not. Feed queries
   filter on channel, status and `updated_since` simultaneously.

## Workflow bottlenecks

1. **One QA owner, who is the founder.** Every product funnels through a single
   person, and AMD-04 proposes making that a hard gate. At 1000 SKUs this is the
   binding constraint on the whole business.
2. **Image approval does not scale.** Five roles × 1000 variants is 5000
   approvals by the brand owner (AMD-05). Needs approval at style level with
   variant exceptions, or a delegated reviewer.
3. **Photography is serialised behind data entry.** The gate requires a SKU
   before assets can attach, while POS-6.2 claims photography and content run in
   parallel. Both cannot be true. Shooting happens before SKUs exist in every
   real studio workflow; assets need a pre-SKU holding state.
4. **Per-channel publication × eight channels × QA** is left ambiguous. If QA is
   per channel, that is eight reviews per product.
5. **The duplicate-description rule fights the variant model.** Copy lives on
   product, so colourways legitimately share it — but the content gate forbids
   duplicate descriptions, and marketplaces penalise near-identical *products*.
   The tension is real and unresolved; at 1000 SKUs it is not solvable by hand.

---

## What is sound and should survive

Stated briefly, for calibration rather than reassurance.

- **The ownership register in both directions (§1.1, §1.2).** The
  non-ownership list is the strongest thing in the document and the part most
  likely to save the project. Keep it verbatim.
- **The architecture/business-rule separation and the amendment register.** The
  governance model works; it correctly caught fourteen rule changes that would
  otherwise have shipped as decisions.
- **Pull-first publication with hash-based skip.** Right call for the
  constraints, once M5 is fixed.
- **The five field classes**, particularly the computed/generated distinction.
- **Answering the eight open questions with reasons.** Decisions with stated
  justification can be revisited; assumptions cannot.
- **Phases 2–7 changing storage without behaviour.** Correct sequencing
  instinct, undermined by M3 and B3.

---

## Recommendation

**Do not approve PR #3.** Return it for the four blockers, then approve.

Minimum changes before approval:

1. Add `bundle_component` and variant `kind`; make bundle inventory computed
   (B1).
2. State the natural-key uniqueness constraint that implements OD-2, and make
   supplier-mapping collisions hard errors (B2).
3. Fix the two colliding code fallbacks, make the SKU guard throw, and replace
   phase 2's row-count acceptance test with a grouping verification (B3).
4. Resolve image storage economics against the free-tier constraint, with
   arithmetic in the document (B4).
5. Carve phase 0 out of POS-11.3 so the backup can be fixed now (M9).

Then, before implementation begins: decide M1 (roles), M2 (cost series), M3
(`flatView` lifetime), M4 (identity coupling), M5 (hash definition), and whether
M6's middle layer is built now or deferred behind a documented trigger.

The over-engineering list and the merge/split lists are not approval blockers,
but every item on them is cheaper to remove now than after something joins to
it.
