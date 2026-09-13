# Implementation roadmap

**Authority:** `docs/product-operating-system.md` v2.0.
**Status:** plan only. No implementation.

Fifteen phases. Each is independently shippable, each leaves Catalogue Studio
working, and each preserves the existing exports, validations and health check
until they are intentionally replaced.

**Complexity** is relative sizing for one developer, not a commitment: **S** ≈
half a day to a day, **M** ≈ two to four days, **L** ≈ a week or more.

**Five phases are blocked on decisions you have not made.** Granting the
specification authority did not resolve the fourteen amendments in §13 or the six
business questions in §16. Those phases are marked `BLOCKED` with what unblocks
them. Everything else is schedulable today.

---

## Recommended first phase

**P1 — the read shim.** Reasoning at the end of this document.

---

## Dependency graph

```
P0 backups ──(independent, do today)

P1 shim ──┬── P2 schema ──┬── P3 derive+verify ── P4 read switch ── P5 write switch ──┬── P8 assets
          │               │                                                           ├── P10 cost+units
          │               └── P6 settings split                                       ├── P11 attributes
          │                                                                           ├── P12 channel_listing ── P14 Shopify sync
          └── P9 format aliases ──(must precede P8)                                   └── P13 statutory

P7 bundles ──(needs P5; BLOCKED on §16 Q1)
deferred work ──(triggers, not dates — see end)
```

Critical path: **P1 → P2 → P3 → P4 → P5**. Everything valuable downstream waits
on that line, and nothing on it is blocked by a business decision.

---

## Phase 0 — Restore the safety net

**Objective.** Make backups work again and make their failure loud.

**Why first.** There is currently no backup of anything. The workflow prints
`no BACKUP_REPO_TOKEN secret -> backup skipped` and exits **zero**, so it reports
success hourly while doing nothing. POS-19 exempts this phase from the
no-code-before-approval rule precisely so it cannot be blocked.

**Affected files.** `.github/workflows/healthcheck.yml`,
`scripts/build-backup.mjs`.

**Complexity.** S. Most of the work is creating the token, which only you can do.

**Risks.** Low. Making the skip paths fail loudly will surface the missing token
as a red run — that is the point, not a regression.

**Success criteria.** A backup file lands in `catalogue-backups`. A run with the
token deliberately removed fails and opens an issue. The zero-product guard is
exercised once against a copy.

**Backward compatibility.** Total. No application code.

**Quick win. Not irreversible.**

---

## Phase 1 — The read shim

**Objective.** Introduce `flatView()` as the single read path for the flat
product shape, returning today's row unchanged. Pure indirection, zero behaviour
change.

**Why it matters.** POS-17 makes the shim the mechanism by which storage changes
without behaviour changing. Creating the seam *before* anything moves is what
makes phases 3–8 low-risk. Built later, every subsequent phase has to touch
adapters directly.

**Affected files.** New `src/compat/flatView.js`. Re-point reads in
`src/components/ExportView.jsx` (the export builders and `healthCheck`),
`src/components/CatalogueView.jsx`, `src/components/EditView.jsx`,
`src/App.jsx`.

**Complexity.** S.

**Risks.** Very low, and detectable: any divergence shows up immediately in
exports or the health check, both of which are deterministic over 24 products.
The real risk is scope creep — the shim must not "improve" anything.

**Success criteria.** Every export format and the full health check produce
**byte-identical** output before and after. No UI change. No schema change.

**Backward compatibility.** Total, by construction.

**Quick win. Reversible — it is one function and a set of imports.**

---

## Phase 2 — New schema alongside, empty

**Objective.** Create the v2.0 tables — `product`, `sku`, `sku_component`,
`asset`, `colour`, `material`, `category`, `supplier`, `channel`,
`channel_listing` — with RLS policies matching the existing allow-list pattern.
Nothing reads or writes them.

**Affected files.** `supabase/setup.sql` (a new `v6` section following the
established idempotent, re-runnable idiom).

**Complexity.** M.

**Risks.** Low while unused. The risk is getting constraints wrong — in
particular the POS-7 natural-key uniqueness, which is the constraint that
actually implements "every SKU exists exactly once". Get that wrong and later
phases inherit duplicate rows.

**Success criteria.** `setup.sql` runs twice with no error. The natural-key
constraint rejects a deliberate duplicate. Existing tables untouched. The app is
unaffected because nothing references the new tables.

**Backward compatibility.** Total. Additive only.

**Depends on.** Nothing, but ship after P1 so the seam exists first.

---

## Phase 3 — Derive and verify, without switching

**Objective.** A one-shot script derives `product` and `sku` rows from the 24
existing rows using `decodeSku`, writes them to the new tables, and **verifies**
that `flatView` assembled from the new model is identical to the old row for
every SKU. Output is a report. Nothing switches.

**Why this shape.** This is the highest-information, lowest-risk step in the
plan. It answers "does the whole approach work" for the cost of a script, before
anything depends on the answer. With 24 products a one-shot backfill is correct;
dual-write would be over-engineering at this size.

**Affected files.** New `scripts/derive.mjs`. Read-only against
`catalogue_products`.

**Complexity.** M.

**Risks.** **This is where the v1 review's B3 finding lands.** Grouping by
decoded style number is unsafe alone: if a style number was ever bumped to dodge
a colour or material collision, the grouping silently splits or merges designs,
and a row-count check passes anyway. Verification must compare **physical
attributes** within each derived group, not counts, and report conflicts rather
than resolving them.

Expect real conflicts. The `YSWTO0084` family has no `colour` at all, and the
registry disagrees with issued SKUs about `CO`.

**Success criteria.** A report listing: derived product count, SKU count,
per-group attribute conflicts, and SKUs that fail to decode. `flatView` output
identical for every SKU that derived cleanly. **Zero silent resolutions.**

**Backward compatibility.** Total — the script only writes to new tables.

**Depends on.** P1, P2.

---

## Phase 4 — Switch reads

**Objective.** `flatView` assembles from `product` + `sku` instead of reading
`catalogue_products`. The old table is retained and untouched.

**Affected files.** `src/compat/flatView.js`, `src/lib/storage.js` (`loadAll`).

**Complexity.** M.

**Risks.** Medium. First phase where a defect is user-visible. Mitigated by P3
having already proven equivalence, and by rollback being a one-line flip while
the old table still holds the authoritative data.

**Success criteria.** Exports and health check still byte-identical. Catalogue,
editor, studio and match screens behave identically. Rollback demonstrated once,
deliberately.

**Backward compatibility.** Preserved by the shim. The old table remains
readable.

**Depends on.** P3 clean.

---

## Phase 5 — Switch writes

**Objective.** Saves, imports and image links write to `product` + `sku`.
`catalogue_products` becomes read-only legacy.

**Affected files.** `src/lib/storage.js` (`upsertProducts`, `deleteProducts`,
`replaceAllProducts`), `src/App.jsx` (`upsertProduct`, `addProducts`,
`applyImage`, `applyThumb`, `restoreAll`), `src/components/ExportView.jsx`
(import path), `src/components/EditView.jsx`.

**Complexity.** L.

**Risks.** **Highest-risk phase in the plan.** After it ships, new data exists
only in the new tables, so this is the first genuinely hard-to-reverse step.
Specific hazards: the importer's non-empty-wins merge must be reimplemented
against two tables without changing its semantics; realtime subscriptions key on
`catalogue_products` and must move; `restoreAll` must be able to restore a
pre-migration backup.

**Success criteria.** Create, edit, duplicate, delete, bulk delete, import (both
modes) and image upload all behave identically. A pre-migration JSON backup
restores correctly. Realtime and presence still work across two browsers. A full
backup is taken immediately before and verified.

**Backward compatibility.** Reads preserved by the shim; **write compatibility
ends here by design.**

**Depends on.** P4. **Irreversible in practice.**

---

## Phase 6 — Split the settings row

**Objective.** Decompose the single `catalogue_settings` JSON row into `brand`,
`category`, `colour`, `material`, `supplier`, `channel` tables.

**Why.** It is the highest-contention object in the system: brands, categories,
materials, colours, SKU rules, export preferences and custom formats share one
row, autosaved on a 700 ms debounce with last-write-wins. Two people editing
different settings silently lose one change. v1.0 said to fix it and then omitted
it from every phase.

**Affected files.** `supabase/setup.sql`, `src/lib/storage.js` (`saveSettings`,
`loadAll`, `pickSettings`), `src/App.jsx` (the settings autosave effect),
`src/components/BrandsView.jsx`.

**Complexity.** M.

**Risks.** Medium. `customFormats` is user-authored data living in that row and
must survive intact — see P9.

**Success criteria.** Two browsers change different settings concurrently and
both persist. All saved custom formats still export identically.

**Backward compatibility.** Preserved. Reads keep the same shape via `ctx`.

**Depends on.** P2. Independent of P3–P5, so it can run in parallel.

**Quick win relative to its value** — it fixes a live data-loss bug.

---

## Phase 7 — Bundles

**Objective.** `kind`, `is_sellable`, and `sku_component` rows for the eight
kits. Bundle availability computed from components; `contents` generated.

**BLOCKED on §16 Q1: are the kit components separately stocked or sold?**

If the kits arrive from the supplier sealed, the components are never stocked
separately and they should stay simple SKUs with descriptive contents — which is
what the current model already does correctly. Decomposing them would create
roughly ten records of pure overhead for a two-person team. **Do not build this
until the answer is known.**

**Affected files.** `supabase/setup.sql`, `src/compat/flatView.js` (generate
`contents`), `src/components/EditView.jsx` (a components sub-form — a UI
addition the data model requires, not a redesign), `src/lib/storage.js`.

**Complexity.** M, plus S for the editor addition.

**Risks.** Medium. Bundle stock must be computed, never stored, or it
double-counts. A bundle's readiness must consider component data completeness but
not component product status, or live kits will be blocked by components that can
never be `ready` — the gap the final review found.

**Success criteria.** Bundle availability computes correctly against component
stock. Generated `contents` matches today's text exactly for all eight kits. No
component SKU is double-counted in any feed.

**Depends on.** P5.

---

## Phase 8 — Assets

**Objective.** One `asset` table replacing `imageUrl`–`imageUrl5`, `videoUrl` and
`thumb`. Roles `main`, `gallery`, `swatch`. Originals only, capped at 2500 px.

**Affected files.** `supabase/setup.sql`, `src/lib/storage.js` (the image
helpers), `src/compat/flatView.js` (project assets back into the five URL
fields), `src/components/StudioView.jsx`, `src/components/MatchView.jsx`,
`src/components/CatalogueView.jsx`.

**Complexity.** L.

**Risks.** High, and one is easy to miss: **legacy paths must remain readable
indefinitely.** Marketplaces hold `products/<SKU>/1.jpg` URLs in live listings,
and breaking them breaks published listings, not just the app. New writes key on
`sku_id` per POS-4.1; existing paths are preserved, never rewritten.

**Success criteria.** Every previously reachable image URL still resolves. All
five URL fields still populate through the shim, so exports are unchanged. Studio
and Match still upload and link correctly.

**Depends on.** P5, **and P9 must ship first.**

---

## Phase 9 — Custom format aliases

**Objective.** A field-key alias table so saved marketplace formats survive later
phases.

**Why it is its own phase.** `FormatBuilder` stores each mapped column as a
`FIELDS` key — `imageUrl2`, `weightUnit`, `about`. P8 moves images, P10 abolishes
`weight_unit`, P11 moves bag attributes. An unmapped column is a **legitimate**
state in that builder, so a stale key produces a **blank column, not an error**.
This is the only user-authored data no other phase covers, and the failure is
silent.

**Affected files.** `src/config/fields.js` (an alias map),
`src/components/FormatBuilder.jsx`, `src/components/ExportView.jsx` (resolution).

**Complexity.** S.

**Risks.** Low. The risk of *not* doing it is a marketplace upload with silently
empty columns.

**Success criteria.** A format saved before the phase exports identically after
P8, P10 and P11. A deliberately stale key resolves through the alias or reports
an error — never a silent blank.

**Depends on.** P1. **Must precede P8, P10 and P11.**

**Quick win, and a prerequisite. Schedule it early.**

---

## Phase 10 — Cost series and unit conventions

**Objective.** Cost becomes an effective-dated series. GST as a percentage,
`warranty_months` as an integer, weight in grams, `weight_unit` abolished.

**BLOCKED on AMD-08.**

**Affected files.** `supabase/setup.sql`, `src/config/fields.js`,
`src/lib/util.js` (`marginOf`), `src/components/ExportView.jsx` (per-channel
rendering), `src/compat/flatView.js`.

**Complexity.** M.

**Risks.** Medium and outward-facing. Adapters must re-render to each channel's
expected format — Flipkart's "Tax Code (GST)" and Myntra's "GST %" differ, and
getting it wrong sends a wrong tax rate to a marketplace. Verify that **no
channel receives a changed value.**

Also resolve the specification's own contradiction here: §2.1 lists cost as a SKU
field while §6 calls it a dated series. The series is correct; the entity count
becomes fifteen.

**Success criteria.** No price or tax value differs in any export once conversion
is applied. Margin reconstructs correctly for a SKU with two cost rows at
different dates.

**Depends on.** P5, P9.

---

## Phase 11 — Category attribute sets

**Objective.** Move `laptop`, `compartment`, `water` and `pattern` out of the
universal field list into the Bags required-attribute list. Attributes become a
JSON object on the product, validated against required key names on the category.

**Partially blocked on AMD-09** (the required-field tiers).

**Affected files.** `src/config/fields.js`, `src/config/taxonomy.js`,
`src/components/EditView.jsx` (render attributes from the category),
`src/components/BrandsView.jsx` (completeness editing),
`src/components/ExportView.jsx` (`healthCheck` required-field loop),
`src/compat/flatView.js`.

**Complexity.** M.

**Risks.** Medium. Four fields stop being universal, and three separate consumers
read them by key: the five marketplace adapters, saved custom formats, and the
health check's required-field loop. P9's aliases cover the formats; the adapters
and health check must be re-pointed in the same commit or exports lose columns
silently. Lower risk than it appears because the shim keeps projecting all four.

**Success criteria.** A second category can be added with its own attributes and
no schema change. All existing exports unchanged via the shim. Health check still
reports per-field gaps.

**Depends on.** P5, P9.

---

## Phase 12 — Channel listings

**Objective.** `channel_listing` rows capturing external ID, listing status, last
error and last-pushed hash, seeded from saved formats. Manual entry of ASINs and
style IDs is enough to start.

**Why it matters.** This is the first phase that delivers a capability the
current tool does not have: memory of what is actually live where. It is the
difference between a catalogue and an operating system.

**Affected files.** `supabase/setup.sql`, `src/lib/storage.js`, a new view or an
addition to `src/components/ExportView.jsx`, `src/compat/flatView.js`.

**Complexity.** M.

**Risks.** Low. Additive, and nothing depends on it yet.

**Success criteria.** An ASIN recorded against a SKU survives a reload and
appears in exports where a channel wants it. Readiness per channel reads from the
existing report.

**Depends on.** P5.

---

## Phase 13 — Statutory fields

**Objective.** Add the Legal Metrology block to the SKU, defaulting from brand
and supplier.

**BLOCKED on the final review's pre-approval amendment:**
`manufacture_month_year` was removed from v2.0 on the grounds that it is printed
from a production record — but the production record is deferred, so the field
exists nowhere, and month-and-year of manufacture is part of the declaration set
ONDC transmits. **ONDC cannot be served until this is restored.**

**Affected files.** `supabase/setup.sql`, `src/config/fields.js`,
`src/components/EditView.jsx`, `src/components/ExportView.jsx` (required sets).

**Complexity.** M.

**Risks.** Compliance rather than technical. §5's verification duty stands:
reconcile against current seller-portal documentation and confirm the Legal
Metrology wording with an adviser before any launch.

**Success criteria.** Statutory completeness report shows zero gaps for every
SKU intended for ONDC or Amazon.

**Depends on.** P5. Best combined with the bulk upload so the data is entered
once.

---

## Phase 14 — First API channel

**Objective.** Shopify from file export to API sync: push a product, record the
external ID, re-push only on hash difference.

**BLOCKED on the inventory-authority decision** (final review amendment 1). The
specification claims the POS owns quantity per SKU while Shopify must hold its
own stock to block oversell. There is no inbound path for "one unit sold", so the
POS count is wrong from the first order. **Do not build a sync that writes stock
in one direction only.**

**Affected files.** New `src/channels/shopify/`, `src/lib/storage.js`,
`supabase/setup.sql`.

**Complexity.** L.

**Risks.** Highest outward-facing risk in the plan. It writes to a live
storefront. Also the first place the Shopify three-option ceiling bites: the
natural key permits five variant dimensions and Shopify allows three.

**Success criteria.** One product round-trips. A field edit re-pushes only the
changed SKU. Stock reconciles after a test order.

**Depends on.** P12, and the inventory decision.

---

## Deferred work — triggers, not phases

Triggers, not dates. Building any of these earlier is the over-engineering the
specification exists to prevent.

| Work | Trigger |
|---|---|
| Server-side paging and filtering for the editor | Catalogue exceeds 500 SKUs, or first load exceeds 3 seconds |
| Move image originals off the free tier | Originals exceed 700 MB (~600 SKUs at three images each) |
| Event log retention and archival | 24 months of history |
| Materialised per-channel projections | More than two API channels, or a feed build that is too slow to run interactively |
| Per-channel price overrides | A second marketplace requires a different price |
| Stock condition and returns disposition | **Before the first marketplace listing goes live** — earlier than the rest of this table |
| Material code widening to two characters | The material registry approaches 26 entries |
| Production batches | Two runs of one SKU must be distinguished |

---

## Classification

**Quick wins.** P0 (backups), P1 (shim), P9 (aliases), P6 (settings split — small
effort, fixes a live data-loss bug).

**High risk.** P5 (write switch — first hard-to-reverse step), P8 (assets — can
break URLs held in live marketplace listings), P14 (writes to a live storefront),
P10 (a wrong tax rate reaching a marketplace).

**Irreversible decisions.** P5, once new writes land. P8's new asset paths. And
two that are business decisions rather than phases: AMD-01 freezing issued SKUs,
and AMD-03 retiring `CO` — once retired and aliased, un-retiring it cleanly is
not possible.

**Blocked.** P7 (§16 Q1), P10 (AMD-08), P11 (partly AMD-09), P13
(`manufacture_month_year`), P14 (inventory authority).

---

## Recommended first implementation phase

**P1 — the read shim.** With **P0 as a same-day prerequisite**, since it is
exempt from the approval rule and there is currently no backup of anything.

Why P1 rather than anything else:

1. **It is the enabling constraint for the whole plan.** POS-17 makes the shim
   the mechanism by which storage changes without behaviour changing. Every phase
   from P3 to P13 depends on that seam existing. Built later, each of them has to
   touch the five marketplace adapters, the custom format builder and the
   twenty-five-rule health check directly — and that is where regressions come
   from.
2. **It is the cheapest phase with the highest leverage.** One new file and a set
   of import changes. No schema, no UI, no data movement.
3. **It is verifiable to a standard nothing else offers.** Success is
   byte-identical export output over 24 deterministic products. Either it passes
   or it does not; there is no judgement call.
4. **It is fully reversible.** Reverting is deleting one function and restoring
   imports.
5. **It proves the discipline the specification asks for** — migration over
   replacement — on the first commit, at near-zero risk, which matters when the
   next four phases are riskier.

What I would explicitly *not* start with: P2 (schema before a seam invites direct
coupling to new tables), P7 (blocked, and may turn out to be unnecessary work),
and P12 (the most visible new capability, but building it before P5 means
building it twice).
