# Product Operating System — Specification v2.0

**Status:** proposed for review. Supersedes v1.0, which was reviewed and
rejected. No code may be written against this document until it is approved,
**except** migration phase 0 (see POS-19).

**Authority:** the constitutional document for the Yselle Product Operating
System. Where an implementation conflicts with it, this document wins — or it is
amended first.

**What it replaces.** `yselle/docs/product-operating-system.md`, the placeholder
that records what the POS owns and closes with "when the POS architecture exists,
this file is replaced by it". On approval that file becomes a pointer to this one.

**Why v2.** v1.0 was reviewed adversarially in
`docs/decisions/0001-review-of-pos-spec-v1.md`. Four blockers and nine major
findings. v2.0 resolves the blockers and removes roughly forty per cent of the
entity model. **Fourteen entities, down from twenty-four.** The changes and the
reasons are in §15.

---

## The principle

> **Every SKU exists exactly once.**

Everything else derives from it. Three consequences, and the whole design follows
from them:

1. **One table holds SKUs.** Not one per channel, not one per warehouse, not one
   per bundle. One.
2. **If a thing is sellable or stockable, it is a SKU** — including a component
   inside a kit. It gets one row, whether or not it is sold on its own.
3. **Anything a SKU can be derived from is not stored on the SKU.** Shared facts
   live on the product above it; channel renderings are generated below it.

**POS-1** — A new entity MUST justify itself against the first 100–200 SKUs. A
concept whose value arrives only at 5,000 SKUs is deferred with a written
trigger, not built early.

---

## 0. Governance

`MUST` / `SHOULD` / `MAY` carry their usual force. There are **nineteen**
numbered rules in this document, down from fifty-two. A rule nobody can recite
is not a rule.

Two kinds of statement appear here and they carry different authority.

- **Architecture** — data shape, ownership, references, protocols. Ratified here.
- **Business rules** — what the business requires, permits, forbids. **Not mine
  to ratify.** Changes are recorded in §13 as amendments and MUST NOT be
  implemented until approved.

**POS-2** — Before any architectural change is proposed, the existing business
rule(s) it affects MUST be identified. If the proposal changes one, it is
presented as an amendment, not a decision.

### Owner-directed rules (in force)

| # | Rule |
|---|---|
| OD-1 | The POS is the single source of truth for the business. |
| OD-2 | Every SKU exists exactly once. Everything else is generated from that record. |
| OD-3 | The website does not own product data. Shopify does not own product data. |
| OD-4 | Every sales channel, present and future, is a downstream consumer. |
| OD-5 | The POS MUST NOT be inferred or designed from the website. |
| OD-6 | The website is feature-frozen: critical bugs, checkout, real photography/content, POS integration. Everything else stays in `yselle/docs/site-changes.md`. |
| OD-7 | Documents go in the repository as Markdown. Nothing is published as a Claude artifact. |
| OD-8 | Never write a second version of something an existing document already decides. |

---

## 1. Ownership boundaries

### 1.1 What the POS owns

| Domain | Owned value |
|---|---|
| Product record | The canonical record of every product and every SKU |
| Materials | Which material a product is made of, referencing the Brand Bible's ladder |
| Colours | Colour registry, codes, channel colour families |
| Dimensions | Product dimensions and weight; package dimensions and gross weight |
| Pricing | Cost, MRP, selling price |
| Media | Originals, roles, order, alt text, licence, provenance |
| SEO | Per-product slug, meta title, meta description, search terms |
| Copy | Titles, descriptions, bullets |
| Collections | Membership and order |
| Packaging | Pack type, net quantity, statutory declarations |
| Inventory | Quantity per SKU |
| Marketplace mappings | Field and category mappings; per-SKU listing state |
| Suppliers | Vendor identity, terms, SKU-prefix rule |

### 1.2 What the POS does not own

A boundary is only real if it says what is outside. A source of truth that
expands without limit becomes the system everything waits for.

| Domain | Owner | Why not the POS |
|---|---|---|
| Orders, carts, checkout, payments | Shopify | Transactional state with its own consistency and compliance needs. |
| Customers and consent | Shopify | Personal data with erasure obligations. Excluding it keeps the POS out of scope for those requests. |
| **Brand doctrine** — the Material Ladder, permitted CTAs, lifespan claims | `yselle/YSELLE-Brand-Bible-v2.md` | The Bible decides what the brand *permits*. The POS records what *exists*. Doctrine is not data. [AMD-13] |
| Site presentation — layout, type scale, palette, section rhythm, SEO templates | Website repo | The POS supplies values; the website composes them. |
| Stylist logic, scoring weights | Website repo | Merchandising logic, not product data. |
| Policy prose — returns, shipping, privacy | Website repo | Legal review. |
| Listing identity and state — ASIN, listing status, rejection reasons | The marketplace | Authored by the channel. The POS records them. |
| Fulfilment execution, courier tracking | Shopify / 3PL | The POS holds terms, not events. |
| Financial ledger, GST filing | Accounting | The POS holds tax attributes; it is not a book of account. |

**POS-3** — Every field has exactly one owning entity, and every domain has
exactly one owning system. Where two appear to need the same field, one needs a
*reference*, not a copy. This is what prevents `amazon_title`, `myntra_title`,
`meesho_title`.

### 1.3 Direction of authority

Data flows one way. The only inbound write a consumer may make is to its own
listing state.

```
        ┌──────────────────────────────────┐
        │  PRODUCT OPERATING SYSTEM        │
        │  product · sku · asset           │
        └────────────────┬─────────────────┘
                         │ generated, one way
   ┌──────────┬──────────┼──────────┬──────────┐
   ▼          ▼          ▼          ▼          ▼
Shopify    Website   Marketplaces  Social    Future
(commerce            Amazon·Myntra Instagram
 engine;             Flipkart·     ·WhatsApp
 product             Meesho·AJIO
 consumer)           ·ONDC

 ── writes back only: external id, listing status, errors ──
```

**POS-4** — A consumer MUST treat POS data as read-only, MUST NOT round-trip an
edit, and MUST tolerate a field it does not recognise. Adding a field to the POS
MUST NOT break a consumer.

### 1.4 Rules already in force that this affects

| Existing rule | Where | Effect |
|---|---|---|
| "Shopify owns what a merchandiser edits" | `yselle/docs/admin-first-architecture.md` | Superseded in part by OD-3. The Brand-Bible half survives. [AMD-14] |
| "The Material Ladder stays in the repository; the lifespans carry legal weight" | same, Ch.16 | Conflicts with POS ownership of Materials. Resolution in [AMD-13]: doctrine stays; instances live in the POS and reference it. |
| "No downstream system's types leak upward into pages" | `yselle/docs/product-operating-system.md` | Retained, generalised in POS-4. |
| "No downstream system's identifier becomes a public URL" | same | Retained as POS-5. |

**POS-5** — No downstream identifier may become a public URL. Handles are ours;
Shopify GIDs and POS UUIDs stay internal.

---

## 2. The data model

Two entities carry the business. Everything else supports them.

### 2.1 Product and SKU

**`product`** — a design. One row per design, not per colour. Not sellable.

Owns what every colourway shares: name, category, brand, gender, age group,
material, construction attributes, product dimensions, net weight, care,
warranty, HSN, GST rate, copy, SEO, supplier, style number, status.

**`sku`** — a sellable or stockable unit. One row per unit. **OD-2 lives here.**

Owns what distinguishes one unit from another: the SKU string, supplier SKU,
colour, secondary colour, finish, size, GTIN, package dimensions, gross weight,
pack type, net quantity, statutory block, cost, MRP, selling price, quantity on
hand.

> **Why two levels and not three.** v1.0 had `product`, `style` and `variant`,
> justified by "three audiences". All 24 live products resolve 1:1 between
> product and style, and the two audiences that need a separate build record —
> Manufacturing and Repairs — are deferred. The layer was built for consumers the
> same document postponed.
>
> Two levels earn their place *today*: the duplicate-copy problem that cost real
> work in September existed precisely because ten products were colourways of two
> designs with no parent to hold the shared description.
>
> Splitting `product` into product-and-style later is a migration. Un-splitting
> is a rewrite of everything that joined. Merging now is the reversible
> direction.

### 2.2 Bundles — resolving blocker B1

Eight of twenty-four live products are kits: four `pack of 5` combos (tote,
sling, wristlet, mobile case, card holder) and four `pack of 2` sets. v1.0
modelled them as ordinary variants with a free-text contents list — a bill of
materials written as prose so nothing had to reference anything.

**POS-6** — A SKU has a `kind` of `simple` or `bundle`, and an `is_sellable`
flag.

- A **bundle** SKU's contents are rows in `sku_component`: parent SKU, child
  SKU, quantity. Never free text.
- A component MUST be a SKU. It therefore exists **exactly once**, satisfying
  OD-2, whether or not it is sold on its own.
- A component not sold separately has `is_sellable = false`. This is the whole
  mechanism: no separate component entity, no second identity space.
- **Bundle stock is computed, never stored**: `min(floor(child_qty / required))`
  across components. A bundle with stored stock would double-count.
- The `contents` text every marketplace wants is *generated* from the components.

This also removes a v1.0 contradiction in which `pack_type`, `net_quantity` and
`contents` all described a composition that had no structure.

### 2.3 Identity and uniqueness — resolving blocker B2

v1.0 asserted OD-2 four times and enforced it nowhere. It made the SKU *string*
unique, which is not the same as making the *sellable unit* unique — the exact
duplication that already exists in the live data, where colourways are 24
independent top-level rows.

**POS-7** — Uniqueness is enforced on two keys, in the database, not the UI:

1. The SKU string is unique across all SKUs.
2. **The natural key is unique**: `(product_id, colour, colour_secondary,
   finish, size, pack_type)`. This is what actually implements OD-2.

**POS-8** — Supplier SKU mapping MUST be injective or fail loudly. The supplier's
leading brand characters are replaced by our brand code; the remainder is
preserved. `AB1234XYZ` → `YS1234XYZ`. Two supplier codes mapping to one of ours
is a **hard error naming both**, never a skipped row — in a system of record, a
silent skip is a lost product.

### 2.4 SKU generation — resolving blocker B3

The six-segment grammar is retained, because 24 live SKUs, every supplier
purchase order and the in-app legend depend on it.

```
YS   W    TO    0069   P    CB
│    │    │     │      │    └─ colour     2 chars, explicitly assigned
│    │    │     │      └────── material   1 char, explicitly assigned
│    │    │     └───────────── style no.  4 digits, held on the PRODUCT
│    │    └─────────────────── category   2–3 chars
│    └──────────────────────── gender     W · M · U · K
└───────────────────────────── brand      2 chars
```

Three defects in v1.0, all now structural rather than patched:

**POS-9** — Registry codes MUST be explicitly assigned. Auto-generation is
removed. A colour or material without a code is a setup task, not a runtime
guess. v1.0 ratified fallbacks that collide by construction: `"X" + (n % 10)`
repeats after ten, and a single-character material fallback gives PU, Polyester
and Patent the same code.

**POS-10** — The style number belongs to the **product**, not the SKU. This is
the important one. v1.0 resolved SKU collisions by incrementing the style number,
so a colour collision was absorbed by pretending a variant belonged to a
different design — which corrupted the very grouping the migration depends on,
undetectably, because the acceptance test was a row count.

With the style number on the product and the natural key enforced (POS-7), **the
collision class disappears**: a duplicate SKU string can only arise from a
duplicate natural key, which the database now refuses. There is nothing left for
a collision resolver to do, and the silent-duplicate failure mode — a retry loop
that returned a colliding SKU after 5,000 attempts — is deleted rather than
fixed.

**POS-11** — Decoding a SKU is **best-effort, not guaranteed**. v1.0 required
that `decodeSku` reverse any SKU forever, while keeping the registries editable.
Both cannot hold: renaming a category or re-coding a colour breaks every SKU
already issued, and the live data already disagrees with itself about `CO`. The
SKU is an identifier that happens to be readable, not a database. Migration
verification therefore checks decoded segments **and** physical attributes, never
the segment alone.

### 2.5 The entity list

Fourteen, including reference lists and joins.

| Entity | Purpose | Why it earns a place at 200 SKUs |
|---|---|---|
| `brand` | Code and cascading defaults | Exists; second brand is planned |
| `category` | Department, code, name, required-attribute key list | Exists; 95 defined |
| `product` | The design | Holds what colourways share |
| `sku` | The sellable unit | OD-2 |
| `sku_component` | Bundle contents | A third of the catalogue is a kit |
| `colour` | Registry with explicit codes | Drives a SKU segment |
| `material` | Registry, referencing the Brand Bible ladder | Drives a SKU segment |
| `asset` | Media and documents, one table with a `kind` | Every product needs images |
| `collection` + join | Merchandising groups, ordered | Website navigation |
| `supplier` | Vendor and its SKU-prefix rule | Already needed by import |
| `channel` | Registry, mapping reference | Five adapters already exist |
| `channel_listing` | Per channel × SKU: external id, status, last push | The difference between a catalogue and an operating system |
| `event` | Append-only change log with field diffs | Exists; the audit trail |

**Composition, attributes and copy are fields, not entities.** Material
composition is a small JSON structure on the product. Category-specific
attributes are a JSON object on the product, validated against a list of
required key names on the category — no definition registry, no type system.
Copy and SEO are product fields; their history is already in `event`.

---

## 3. Media — resolving blocker B4

v1.0 specified one immutable original per role plus four stored renditions.
Against a free-tier-only constraint, the arithmetic it never did:

| SKUs | Originals | Renditions | Total |
|---|---|---|---|
| 200 | ~0.5 GB | ~0.6 GB | **~1.1 GB** |
| 1000 | ~2.5 GB | ~3.0 GB | **~5.5 GB** |

Against an allowance on the order of 1 GB, the strategy was already at the
ceiling at roughly 200 SKUs — a fifth of the target — and a seven-year retention
rule made it monotonic.

**POS-12** — Store **originals only**, capped at 2500 px on the long edge.
Renditions are derived on demand and cached, never stored as durable objects.
Media storage is **host-agnostic**: an asset holds a URL, and managed storage is
one option among Drive, R2 or B2. The existing `directImageUrl` helper and
`rehost.mjs` already make a host move a configuration change.

**Threshold, stated rather than discovered:** when originals exceed 700 MB, move
them to object storage with no egress fees. That is a cost decision with a
trigger, not a surprise.

**Roles are reduced from nine to three.** `main`, `gallery` (ordered), `swatch`.
Nine roles is a curation vocabulary for a team that does not exist yet. "The main
image is on pure white" is a *validation rule* on the main image, not a taxonomy.

Assets attach to a product or a SKU. Colour-specific photography attaches to the
SKU; shared construction detail to the product. Resolution walks SKU → product
and takes the first match.

`asset` also holds documents — tech packs, test reports, licence paperwork —
distinguished by `kind`. v1.0 had two entities with one detailed lifecycle
between them.

**POS-13** — Every asset carries `licence` ∈ `owned` · `licensed` ·
`ai-generated`, and provenance for anything generated: what produced it, its
version, and the source asset. An `ai-generated` asset MUST NOT be the `main`
image of a SKU whose real photograph does not exist. AI may relight and
reposition a real product; it MUST NOT originate product appearance.

---

## 4. Inventory

**POS-14** — Quantity is a field on the SKU, for a single location. Bundle
quantity is computed from components (POS-6) and never stored.

No inventory table, no reservations, no allocation, no per-channel buffers. A
second location is a real trigger for a real table; one location is a column.
Channels receive an availability figure, not an allocation — allocation strands
stock and needs rebalancing nobody has time to do at this volume.

**Deferred with a trigger:** stock condition and returns disposition. Indian
marketplace fashion returns heavily, and returned stock is not new stock. This
becomes necessary the week marketplace returns start arriving, and it is a
column (`condition`) plus a table only if disposition needs history. Not before.

---

## 5. Statutory fields

India's Legal Metrology rules govern pre-packaged goods; ONDC transmits them as a
block; Amazon and Flipkart require a subset. **None exist today**, which is why
ONDC is unreachable rather than merely unbuilt.

On the SKU, because a declaration describes the packaged unit and a pack-of-5
declares a different net quantity from a pack-of-1:

`country_of_origin` · `manufacturer_name` · `manufacturer_address` ·
`packer_name` · `packer_address` · `importer_name` · `net_quantity` ·
`mrp_inclusive_of_taxes` · `consumer_care_name` · `consumer_care_email` ·
`consumer_care_phone` · `generic_name` · `is_returnable` ·
`return_window_days` · `is_cancellable` · `time_to_ship`

Most default from brand and supplier; all may be overridden per SKU.

**`manufacture_month_year` is deliberately omitted.** v1.0 placed it on a 1:1
packaging record and annotated it "per production batch", so a SKU could hold
exactly one manufacture date for all time — a statutory field pointing at a batch
concept that did not exist. Batches are a real future need with a real trigger
(the first time two production runs of one SKU must be distinguished). Until
then the declaration is printed from the production record, not stored here.

> **Verification duty.** Written from the requirement shapes these platforms
> publish, and requirements change. Before any launch this block MUST be
> reconciled against current seller-portal documentation and, for Legal
> Metrology, confirmed with a compliance adviser. This document defines where
> data lives; it is not legal advice.

---

## 6. Field classes

| Class | Definition | Examples |
|---|---|---|
| **Universal** | One correct value everywhere. A fact about the object. | dimensions, weight, material, colour, HSN, GTIN, statutory block |
| **Channel-shaped** | One source, many renderings. Substance universal, shape per channel. | title, description, bullets, gallery order, category |
| **Channel-owned** | The channel authors it; we record it. | ASIN, listing status, rejection reason |
| **Computed** | Pure function of stored fields. Never persisted. | margin, bundle availability, billable weight, completeness, display title |
| **Generated** | An artefact with provenance. Persisted because producing it is expensive. | the SKU string, slug, image renditions, AI copy drafts, channel payloads |

**POS-15** — A computed field MUST NOT exist as a column. v1.0 inherited three —
`margin`, `sku_source`, `missing_fields` — declared computed yet written into
every row as empty strings and recomputed at read: two sources of truth, one
always blank.

Generated artefacts record what produced them, its version, and a hash of the
**inputs** — not of the output. v1.0 defined `payload_hash` both ways in
different sections. Hashing the output means an adapter bug-fix re-pushes the
whole catalogue; hashing inputs alone means a genuine fix never re-pushes. The
stored value is `hash(inputs) + mapping_version`, and either changing triggers a
push.

**Cost is a series, not a scalar.** Landed cost changes per purchase order —
supplier, freight, duty. v1.0 put one number on the variant, so the second PO
silently overwrote the basis of every historical margin. Cost carries an
effective date; `margin` is computed against the cost effective on the date
asked about.

---

## 7. Workflow

A two-person business. v1.0 specified seven states with five named owners —
buyer, merchandiser, photographer, copywriter, brand owner — against a system
with two roles, only one of which is enforced. Every gate was unenforceable while
a pending amendment proposed making them binding. That is architecture theatre.

**Four states on the product, no approval chain, no second person required.**

| State | Meaning | Entry condition |
|---|---|---|
| `draft` | Being worked on. Saves freely with any gaps. | Default |
| `ready` | Complete enough to list somewhere. | Required fields for at least one channel are filled |
| `live` | Listed on at least one channel. | Set by the system when a listing succeeds |
| `archived` | Withdrawn. Nothing deleted. | Listings de-listed; reason recorded |

Publication is **per channel** and lives in `channel_listing.status`, which the
channel owns anyway. There is no separate publication workflow to maintain.

**POS-16** — Never block a save; block a transition. The same product MUST be
saveable with gaps in `draft` and un-promotable to `ready` with those gaps.
Validation runs continuously and reports; it does not gate editing.

Photography and copy need no states. An asset either exists or does not, and the
existing validation already reports what is missing. v1.0's eight-state asset
lifecycle with approvals would have required 5,000 approvals by one person at
1,000 SKUs.

**Assets may exist before a SKU does.** v1.0 required a SKU before an asset could
attach, while claiming photography and content ran in parallel. Shooting happens
before SKUs exist in every real studio. An asset may be uploaded unattached and
assigned later — the existing Match photos screen already works this way.

### 7.1 Claims, without a claims system

The unsubstantiated "eco-friendly construction" and "reflective details" that
shipped on all 24 PU handbags were a real failure. v1.0 answered with a `claim`
entity, a verifier, an evidence table and a publication gate.

The simpler answer, which reuses machinery that already exists: **a banned-phrase
list in validation.** The health check already rejects ALL-CAPS, promotional
wording and contact details. Sustainability and performance claims join that
list. Removing a phrase from the list requires evidence recorded in
`docs/decisions/`, where the Brand Bible's material lifespans already live.

Zero new entities. Same outcome. The failure was nobody checking, not the absence
of a workflow.

---

## 8. Integration contracts

Three contracts, not eight endpoints. At two people with five working spreadsheet
adapters, a REST API is theatre until a channel demands one.

**Contract 1 — File export (today).** The existing adapter builder: ingests a
marketplace's own template, maps columns, saves a named format, exports with
exact headers. A new file channel is onboardable with no deploy. This already
works and is the only contract needed for Amazon, Myntra, Flipkart, Meesho, AJIO
and any buyer.

**Contract 2 — Listing write-back.** Per channel × SKU: external id, listing
status, error, last-pushed hash. The only inbound write. A consumer MUST NOT be
able to modify product, SKU, asset or price. This is the contract that turns
exports into sync, and it is a table before it is an API.

**Contract 3 — Read projection (when an API channel arrives).** A per-channel
payload per SKU — mapped, validated, trimmed to the channel's length budget —
addressed by SKU and carrying the input hash so unchanged SKUs are skipped.
**Pull-first**: consumers read, because a pull model needs no outbound
credentials and degrades safely when a consumer is down. Push is added per
channel where the channel's API requires it.

Deferred until Contract 3 exists: webhooks, event subscriptions, idempotency
keys, materialised projections. The event log stays, because it already exists
and is the audit trail.

**Shopify's position.** Shopify remains the **commerce engine** for the direct
channel — checkout, payments, orders, customers — and is **not** the product
master. It is authoritative for transactional state and a consumer for product
data. This is what keeps checkout integration permitted work while product data
still flows one way. If Shopify is later replaced as the commerce engine, nothing
in §1.1 moves.

**How the website consumes.** A build-time snapshot of catalogue data, with price
and availability read live. The storefront is statically hosted, so a snapshot
keeps it fast and keeps it up when the POS is down; price and stock are the only
fields whose staleness costs a sale or oversells.

**Marketplace mappings** are data, not code: a channel row, a field mapping
(already implemented as saved formats), a category mapping per channel, and
`channel_listing` for state.

---

## 9. Domain re-evaluation

Every domain, with a decision and a reason.

| Domain | Decision | Why |
|---|---|---|
| Product Master Record | **Keep** | The core. |
| Styles | **Merge** into product | 1:1 in all live data; the audiences needing a separate build record are deferred. Merging is the reversible direction. |
| Variants | **Keep** as `sku` | OD-2 lives here. |
| Bundles / kits | **Add** | A third of the catalogue. Was the worst blocker. |
| Materials | **Simplify** | A registry plus a small composition structure on the product. Percentages deferred — no channel asks and no one would fill them. |
| Colours | **Simplify** | Registry with explicitly assigned codes. Colour ≠ finish [AMD-03]. |
| Dimensions | **Keep**, split product from package | Real: freight and marketplace weight slabs need the carton, not the silhouette. |
| Pricing | **Simplify** | Cost (dated), MRP, selling on the SKU. Price lists and validity windows deferred — the business has no prices entered at all. |
| Images & Media | **Merge and simplify** | One `asset` table with documents. Originals only, three roles, derived renditions. |
| Documents | **Merge** into `asset` | Same shape: immutable original, provenance, licence, owner. |
| SEO | **Merge** into product fields | Four fields, not an entity. |
| Product Copy | **Merge** into product fields | Versioning deferred: `event` already records field-level diffs. |
| Collections | **Keep**, trivially | Website navigation needs it. A join with a position. |
| Packaging | **Merge** into SKU | Strictly 1:1, always. v1.0's justification was a documentation argument dressed as a data-modelling one. |
| Manufacturing | **Defer** | `supplier_id` on the product is the whole need until a product is selling. BOM, MOQ, tech packs, sample state: trigger is the first repeat production run. |
| Repairs | **Defer** | Declared as an entity with no shape and no consumer in v1.0. Trigger is the first repair request. |
| Inventory | **Simplify** | A column, one location. A second location is the trigger for a table. |
| Marketplace mappings | **Keep** | Already implemented; `channel_listing` adds the state. |
| AI-generated assets | **Merge** into `asset` | Provenance fields, not an entity. |
| Analytics metadata | **Remove** | Architecture theatre. Every dimension anyone would report along is already a field on the product or SKU. There is nothing to store. |

### 9.1 Removed as architecture theatre

Each of these was in v1.0. Each failed the question *is this solving today's
problem, a realistic future problem, or neither?*

- **Analytics metadata** as a domain — derivable, entirely.
- **`attribute_set` registry** with definitions and types — 95 categories implied
  95 sets. Replaced by a JSON attributes object plus a list of required key names
  on the category. Eighty per cent of the value at five per cent of the cost.
- **`copy` keyed by channel family × locale, versioned** — three dimensions of
  variation for content with one value, one brand, one language, one market.
- **`price_list` with validity windows** — scheduled promotions for a catalogue
  with no prices.
- **Seven webhook event types** — built for consumers that are spreadsheets a
  human uploads.
- **`claim`, `repair`, `document` as entities** — merged, deferred, merged.
- **Eight-state asset lifecycle with per-state approvals** — 5,000 approvals by
  one person at 1,000 SKUs.
- **Seven workflow states with five named role owners** — against a two-role
  system.
- **Eight REST endpoints** — three contracts, one of which is a table.
- **Thirty-seven of fifty-two rule identifiers** — a constitution nobody can
  recite is decoration.

---

## 10. Scaling to 1000 SKUs

The review found six risks beyond storage. Four are addressed; two are
acknowledged with triggers.

| Risk | Status |
|---|---|
| Image storage exceeding free tier at ~200 SKUs | **Fixed** — originals only, capped, host-agnostic, stated threshold (§3) |
| SKU generator O(n) per insert with a silent-duplicate ceiling | **Fixed** — the collision class is gone (POS-10) |
| Settings held in one JSON row, highest-contention object, omitted from every v1 phase | **Fixed** — now migration phase 3 (§11) |
| `flatView` mandated permanently with no deprecation path | **Fixed** — it is now a temporary read shim with a removal condition (POS-17) |
| Whole catalogue held in client memory; `loadAll` fetches everything plus 1000 history rows per page load | **Trigger**: server-side paging when the catalogue exceeds 500 SKUs or first load exceeds 3 seconds. Not before — it is a real rewrite of the editor. |
| Event log unbounded | **Trigger**: retain 24 months, archive beyond. Cheap to add when it matters. |

**POS-17** — The compatibility shim is temporary. It returns today's flat product
shape so existing adapters keep working during migration, and it is **removed
when the last adapter reads the new model**. v1.0 mandated it permanently and
routed seven consumers through it, making the flat row load-bearing forever — the
migration bridge becoming the new legacy.

---

## 11. Migration

The enabling fact, correctly stated: the SKU encodes brand, gender, category,
style number, material and colour, and can be decoded **best-effort** (POS-11).
Grouping is verified against physical attributes as well as decoded segments,
because v1.0's row-count acceptance test could not detect the failure it most
needed to catch.

| Phase | Work | Acceptance |
|---|---|---|
| **0** | Fix backups: set `BACKUP_REPO_TOKEN`, make the two silent `exit 0` skips fail loudly. **Permitted before approval** (POS-19 below). | A backup lands; a deliberately broken run opens an issue |
| **1** | Carry universal and statutory columns in the pending bulk upload — GTIN, country of origin, manufacturer, packer, net quantity, package dimensions, gross weight, consumer care. | Statutory completeness report shows zero gaps |
| **2** | Derive products and SKUs. Group by brand + gender + category + style number; **verify each group shares product-level physical attributes**. Conflicts reported, never guessed. | Every group verified on attributes, not counts; flat-shape output identical per SKU |
| **3** | Decompose the settings row into `brand`, `category`, `colour`, `material`, `supplier`, `channel`. | Two editors can change different settings without losing one |
| **4** | Identify bundles. The eight kits become `kind = bundle`; their components become SKUs with `is_sellable = false` unless sold separately. | Bundle availability computes correctly; `contents` generates identically to today's text |
| **5** | Reconcile identity [AMD-03]. Fix the colour registry, retire `CO` for new issue as a legacy alias, assign explicit codes everywhere. | Every colour and material has an explicit code; no auto-generated codes remain |
| **6** | Assets to one table. Slot 1 becomes `main`, the rest `gallery` in order. Existing paths stay readable. | Every previously reachable image URL still resolves |
| **7** | Split cost into a dated series; drop the three computed-but-stored columns; apply unit conventions [AMD-08]. | No price or tax value differs once conversion is applied |
| **8** | Move bag-specific attributes into the Bags required-key list. | A second category can be added with no schema change |
| **9** | Add `channel_listing`, seeded from saved formats. Then one channel from file to API — **Shopify first**, its model being closest to the new core. | One product round-trips: pushed, external id recorded, edited, only the changed SKU re-pushed |

**POS-19** — Phase 0 is exempt from the no-code-before-approval rule. v1.0
forbade the one change that protects the data the specification governs, while
there was no backup of anything.

Phases 2–8 change storage without changing behaviour, behind the shim, verifiable
against the existing health check. Phase 9 is the first change a user notices and
MUST NOT begin before phase 8.

---

## 12. What is intentionally left undecided

Recording these as open is a decision, not an omission. Deciding them now would
be guessing.

- **Whether Shopify remains the commerce engine.** It is one today. Nothing in
  §1.1 depends on the answer.
- **A second stock location.** The trigger is a second location existing.
- **Multi-currency and export markets.** India-only today. The trigger is a first
  export order.
- **Size systems for apparel and footwear.** Bags are `one size`. The taxonomy
  already contains 95 categories including apparel; size charts, fit and grading
  are designed when a sized category actually launches, not before.
- **Production batches.** Needed the first time two runs of one SKU must be
  distinguished (§5).
- **Per-channel pricing structure.** Deferred until a channel forces a different
  price than another.
- **Whether the editor stays client-side.** §10's trigger decides it, on
  measurement rather than prediction.

---

## 13. Amendment register

Business rules this specification would change. Each states the rule **as it
operates today**, what is proposed, and what approving costs. **None may be
implemented until approved.** Architecture proceeds without them.

| ID | Today | Proposed | Cost | Status |
|---|---|---|---|---|
| **AMD-01** | A SKU can be edited: ticking "manual" makes it a free text field. Archival does not exist, so a deleted SKU's code is reusable. | Issued SKUs immutable; an issued-SKU ledger prevents reuse. | Lose in-place typo correction. Protects supplier POs, printed labels, marketplace records. | Pending |
| **AMD-02** | Products can be deleted — one, many, or all. Used deliberately on 5 Sep. | Archive with a reason; deletion reserved to the owner for erasure requests and duplicates. | The bulk-clear workflow would no longer exist in that form. | Pending |
| **AMD-03** | Colour is free text, auto-registered with a generated code. `Croco Black` etc. are colours. | Colour names a colour; texture moves to `finish`. `CO` retired for new issue as a legacy alias. | Ten of 24 variants restated. Issued SKUs untouched. Resolves a live contradiction. | Pending |
| **AMD-04** | Nothing blocks publication; the health check is advisory by explicit design. | **Revised, much lighter than v1.0:** `ready` cannot be set while required fields are missing. No approval chain, no second person, no per-channel gate. Export itself is not blocked. | One person self-serves. Replaces v1.0's proposal to gate publication behind QA. | Pending, revised |
| **AMD-05** | Images warn, never block. Four combo sets have no image at all. | A main image is required for `ready`. Per-asset approval **withdrawn**. | Minimal. v1.0's version implied 5,000 approvals at 1,000 SKUs. | Pending, reduced |
| **AMD-06** | No claim concept. Any text publishes — how unsubstantiated claims reached all 24 products. | Sustainability and performance phrases join the existing banned-phrase validation. Removing one requires evidence in `docs/decisions/`. **No claim entity.** | Almost none — the validation already exists. | Pending, simplified |
| **AMD-07** | AI copy is immediately publishable. | AI text is a draft until a human edits or confirms it. Recorded on the asset, not a workflow state. | One step. Justified: gemma3:4b broke the required format on 24 of 24. | Pending, simplified |
| **AMD-08** | GST as a fraction (`0.18`); warranty free text; weight as amount + unit. | GST as percentage; `warranty_months` integer; grams only. | One automatable conversion. Adapters must re-render per channel — verify no channel receives a changed value. | Pending |
| **AMD-09** | You control a flat 29-field required list, editable in-app; any requirement can be switched off. | Universal required + per-category required + a statutory block that is not user-editable. | Lose the ability to switch off a statutory requirement. Per-category means fewer irrelevant requirements, not more. | Pending |
| **AMD-10** | Product name is free text, falling back to `contents`. Every row is "Tote Bag" or "Shoulder Bag". | An authored noun phrase excluding colour, size, brand, price; channel titles computed. | All 24 need a real name. Unblocks computed titles per channel budget. | Pending |
| **AMD-11** | No retention policy. | **Withdrawn.** v1.0 proposed 7-year retention of originals, which collided with the free-tier constraint. Retention is reconsidered when storage moves (§3). | None. | Withdrawn |
| **AMD-13** | The Material Ladder stays in the repository; Ch.16 doctrine, lifespans carry legal weight. | Doctrine stays in the Bible. The POS holds material records referencing it, and never redefines a material or its lifespan. | The Ladder is expressed machine-readably once. Resolves POS ownership of Materials without weakening either. | Pending |
| **AMD-14** | "Shopify owns what a merchandiser edits." | Superseded in part by OD-3: Shopify owns no product data. The Brand-Bible half survives. | Merchandiser edits move into the POS. Requires the POS editor to be at least as usable for that task first. | Pending |
| AMD-12 | Cost is already withheld from channels by convention. | Enforced in storage policy. | None. **No approval required** — strengthening. | Recorded |

**Approve by replying with IDs accepted, rejected, or to be changed.** Rejection
reverts to today's behaviour, the more permissive option in every case.

**AMD-13 and AMD-14 need deciding before any POS editor work**, because they
determine what the POS is allowed to be authoritative about. AMD-01 and AMD-03
are urgent regardless — they concern identifiers already drifting.

---

## 14. Change control

| What | Scheme |
|---|---|
| This specification | semver. Major when a principle or a MUST changes, and must record the migration implied. |
| Schema | numbered, forward-only, idempotent — extending the existing `setup.sql` idiom. No down-migrations. |
| Cost, prices | effective-dated rows; never updated in place |
| Assets | immutable originals; a replacement supersedes rather than overwrites |
| Field deprecation | marked with the removing version; survives one minor release |

**POS-18** — Amendments are proposed as a pull request against this file, stating
the rule changed, the reason and the migration required. A code comment is not an
amendment.

---

## 15. What changed from v1.0, and why

### Blockers resolved

| # | v1.0 defect | v2.0 resolution |
|---|---|---|
| B1 | A third of the live catalogue is a kit; no bundle concept. Components either did not exist (inventory fiction) or existed twice (violating OD-2). | `sku_component` rows, `kind`, `is_sellable`. A component is a SKU, so it exists exactly once. Bundle stock computed. |
| B2 | OD-2 asserted four times, enforced nowhere. Uniqueness was on the SKU string, not the sellable unit. Supplier mapping non-injective and silently skipping. | Natural-key uniqueness in the database (POS-7). Supplier collisions are hard errors (POS-8). |
| B3 | Code fallbacks that collide by construction; collision resolver corrupting style grouping; retry loop returning a duplicate after 5,000 attempts. | Explicit codes only (POS-9). Style number on the product, so **the collision class no longer exists** (POS-10). Decoding is best-effort (POS-11). |
| B4 | Storage exceeded the free tier at ~200 SKUs; arithmetic never done. | Originals only, capped, host-agnostic, three roles, stated threshold (POS-12). |

### Majors resolved

Workflow reduced to four states with no role model, so it is implementable · cost
becomes an effective-dated series · the compatibility shim gets a removal
condition · SKU decoding no longer promised forever · hash defined once, over
inputs plus mapping version · Product/Style/Variant merged to two levels ·
returns deferred with a trigger rather than ignored · `manufacture_month_year`
removed rather than pointing at a non-existent batch · phase 0 exempt from the
approval rule.

### Simplifications

**Twenty-four entities to fourteen.** Fifty-two rules to eighteen. Nine image
roles to three. Seven workflow states to four. Eight endpoints to three
contracts. Five named workflow roles to none.

Merged: style→product, packaging→sku, documents→asset, copy and SEO→product
fields, claims→validation. Deferred with triggers: manufacturing, repairs,
inventory table, price lists, copy versioning, webhooks, batches, size systems.
Removed outright: analytics metadata, the attribute-set registry, the asset
approval lifecycle.

### Amendments changed

AMD-04 revised to something one person can satisfy. AMD-05 reduced to a main
image. AMD-06 simplified to a validation list with no entity. AMD-07 simplified.
AMD-11 withdrawn for colliding with the free-tier constraint.

---

## 16. Remaining open questions

Not the same as §12. These need answers before or during implementation.

1. **Are the kit components sold separately?** If the sling bag in
   `YSWHAC0024CB` is also a standalone product, it is a sellable SKU; if not,
   `is_sellable = false`. This changes how many SKUs migration phase 4 creates
   and is a business answer, not an architectural one.
2. **Do you have GS1 membership?** GTIN is required by Amazon and ONDC and costs
   money. Until it exists, GTIN cannot be a required field, and the alternative
   is a documented exemption per marketplace.
3. **Where do product photographs live long-term?** §3 sets a 700 MB trigger;
   the destination — R2, B2, or Supabase paid — is a cost decision.
4. **Who is the second person?** The workflow assumes one operator with an
   optional reviewer. If two people will edit concurrently, the settings
   decomposition in phase 3 becomes more urgent than its position suggests.
5. **Which channel is first, really?** §8 argues Shopify on model fit. If revenue
   is arriving from Myntra, the sequence should follow the money and the
   spreadsheet contract may be sufficient for a long time.
6. **Does the Brand Bible's Material Ladder have machine-readable lifespans?**
   AMD-13 depends on referencing them; if they exist only as prose, that is a
   one-time transcription with legal weight and should be done by whoever owns
   the Bible.

---

## Appendix — current state, for the record

Audited at `catalogue-studio@a182231`: 2,346 lines, 26 files, 24 products, one
brand.

**Reused and promoted, not rebuilt:** the validation engine (25+ rules including
marketplace hygiene — ALL-CAPS, promotional wording, contact details, GST slabs,
HSN digit lengths, duplicate descriptions); the adapter builder (ingests a
marketplace template, scores the header row, auto-maps 40 patterns, saves named
formats, no deploy to onboard); the SKU grammar; the audit log with field-level
diffs; brand defaults cascading; idempotent versioned migrations; the
non-empty-wins import merge; the offline image pipeline; row-level realtime with
presence; the dual local/Supabase backend; the backup guardrails that refuse a
zero or halved dump.

**Known defect in a reused component:** `BACKUP_REPO_TOKEN` is unset, so the
backup step prints `no BACKUP_REPO_TOKEN secret -> backup skipped` and exits
zero. The workflow reports success hourly while backing up nothing. Phase 0.
