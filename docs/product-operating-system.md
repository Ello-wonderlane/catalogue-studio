# Product Operating System — Specification v1.0

**Status:** proposed for review. Not approved. No code may be written against
this document until it is approved.

**Authority:** this specification is the constitutional document for the Yselle
Product Operating System. Where an implementation conflicts with it, this
document wins — or it is amended first, by §11.

**What it replaces.** `yselle/docs/product-operating-system.md` records what the
POS *is* and *owns*, and closes with "when the POS architecture exists, this
file is replaced by it." This is that file. On approval the website's copy
becomes a pointer to this one, so there is never a second version of a document
one of them already decides.

**What it absorbs.** An architectural audit of Catalogue Studio and a draft
Product Master Specification were produced before this document. Both are
folded in here in full. Neither survives as a separate document, because two
documents covering one topic is worse than one long document.

---

## 0. Normative language and governance

`MUST` is a requirement; an implementation violating it is non-conforming.
`SHOULD` is a strong recommendation; deviation requires a recorded reason.
`MAY` is optional. Rule identifiers (`POS-4.2`) are stable and MUST be cited in
commits, migrations and pull requests that implement or deviate from them.

Two kinds of statement appear here and they carry different authority.

- **Architecture** — how data is shaped, where it lives, what references what,
  how systems talk. Ratified by this document.
- **Business rules** — what the business requires, permits and forbids. **Not
  mine to ratify.** Every change to an existing business rule is recorded in
  the Amendment Register (§10) and MUST NOT be implemented until approved.

**POS-0.1** — Before any architectural change is proposed, the existing
business rule(s) it affects MUST be identified. If the proposal changes one, it
is presented as a proposed amendment, not as a decision.

Rules marked `[AMD-nn]` depend on a pending amendment. Everything unmarked is
architecture, or is a rule the owner has already directed.

### Owner-directed rules (ratified)

These were directed by the brand owner and are in force now. They are recorded,
not proposed.

| # | Rule |
|---|---|
| OD-1 | The POS is the single source of truth for the business. |
| OD-2 | Every SKU exists exactly once in the POS. Everything else is generated from that record. |
| OD-3 | The website does not own product data. Shopify does not own product data. |
| OD-4 | Every sales channel — present and future — is a downstream consumer. |
| OD-5 | The POS MUST NOT be inferred or designed from the website. The website adapts to the POS, never the reverse. |
| OD-6 | The website is feature-frozen. Permitted work: critical production bugs, checkout integration, real photography/content integration, POS integration. Everything else stays in `yselle/docs/site-changes.md` until explicitly approved. |
| OD-7 | Documents go in the repository as Markdown. Nothing from this project is published as a Claude artifact. |
| OD-8 | Never write a second version of something an existing document already decides. Extend it, or propose an amendment. |

---

## 1. Ownership boundaries

The hardest part of this system is not the schema. It is the discipline about
who is allowed to be right.

### 1.1 What the POS owns

The POS is authoritative for all of the following. No consumer may hold a
competing value.

| Domain | Includes |
|---|---|
| Product Master Record | The canonical record of every product and sellable unit |
| Styles | Silhouette, construction, tech pack reference |
| Variants | The sellable unit; SKU, colour, size |
| Materials | Material records and per-style composition |
| Colours | Colour registry, codes, families |
| Dimensions | Product and package dimensions, weights |
| Pricing | Cost, MRP, selling, per-channel price lists |
| Images & Media | Originals, renditions, roles, approval, licensing |
| Documents | Tech packs, test reports, certificates, claim evidence |
| SEO | Slugs, meta titles and descriptions, search terms |
| Product Copy | Titles, descriptions, bullets, versioned |
| Collections | Merchandising groupings and their order |
| Packaging | Pack type, contents, statutory declarations |
| Manufacturing | Supplier, BOM, MOQ, lead time, sample state |
| Repairs | Repair history and serviceable-part references |
| Inventory | Quantity, location, reservation |
| Marketplace mappings | Field, category and attribute mappings per channel |
| AI-generated assets | Generated images and copy, with provenance |
| Analytics metadata | Dimensions products are reported along |

**POS-1.1** — A consumer MUST NOT be the system of record for anything in the
table above. Where a consumer holds a copy, that copy is a projection and MUST
be replaceable from the POS without loss.

### 1.2 What the POS does not own

A boundary is only real if it says what is *outside*. This register is as
important as the one above, because a source of truth that expands without
limit becomes the system everything waits for.

| Domain | Owner | Why not the POS |
|---|---|---|
| Orders, carts, checkout, payments | Shopify | Transactional state with its own consistency and compliance requirements. The POS has no business holding a payment record. |
| Customers and their consent | Shopify / CRM | Personal data with erasure obligations. Keeping it out of the POS keeps the POS out of scope for those requests. |
| Brand doctrine | `yselle/YSELLE-Brand-Bible-v2.md` | The Bible decides what the brand *permits*. The POS records what exists. Doctrine is not data. [AMD-13] |
| Site layout, type scale, palette, section rhythm | Website repository | Presentation. The POS supplies content, never composition. |
| Permitted CTAs, stylist scoring weights | Website repository | Merchandising logic, not product data. |
| Policy prose — returns, shipping, privacy | Website repository | Legal review, not merchandising. |
| Marketplace listing state | The marketplace | ASINs, listing status and rejection reasons are authored by the channel. The POS records them. |
| Fulfilment execution, courier tracking | Shopify / 3PL | Operational. The POS holds terms, not events. |
| Financial ledger, GST filing | Accounting system | The POS holds tax attributes; it is not a book of account. |

**POS-1.2** — Adding a domain to §1.1 is an amendment under §11, not an
implementation detail. The register in §1.2 exists to be defended.

### 1.3 Direction of authority

```
                    ┌──────────────────────────────────┐
                    │   PRODUCT OPERATING SYSTEM       │
                    │   single source of truth         │
                    │   (Catalogue Studio, evolving)   │
                    └────────────────┬─────────────────┘
                                     │  generated, one way
       ┌───────────┬─────────────────┼──────────────────┬───────────┐
       ▼           ▼                 ▼                  ▼           ▼
   Shopify      Website         Marketplaces         Social      Future
  (commerce    (storefront)    Amazon · Myntra      Instagram   channels
   engine;                     Flipkart · Meesho      Shop
   product                     AJIO · ONDC          WhatsApp
   consumer)                                        Commerce

   ── writes back only to channel_listing: external IDs, status, errors ──
```

**POS-1.3** — Data flows one way. The only inbound write a consumer may make is
to `channel_listing` (§7.3). A consumer MUST NOT be able to modify product,
style, variant, packaging, copy, media or price.

### 1.4 Conflicts with rules already in force

Per POS-0.1, these existing rules are affected by this specification.

| Existing rule | Where | Effect |
|---|---|---|
| "Shopify owns what a merchandiser edits; the repository owns what the Brand Bible decides." | `yselle/docs/admin-first-architecture.md` | **Superseded in part.** Shopify owns no product data (OD-3). The repository/Bible half survives. Recorded as [AMD-14]. |
| "`MATERIALS` — the Material Ladder stays in the repository. The lifespans carry legal weight." | same, Ch.16 doctrine | **Conflicts with POS ownership of Materials.** Resolution proposed in [AMD-13]: doctrine stays in the Bible; instances live in the POS and are validated against it. |
| "No downstream system's types leak upward into pages." | `yselle/docs/product-operating-system.md` | **Retained and generalised** as POS-7.6. |
| "No downstream system's identifier becomes a public URL." | same | **Retained and generalised** as POS-7.7. |
| "`lib/data.ts` is the single source of truth." | `yselle/web/MIGRATION.md` | Already recorded as historical. No action. |

---

## 2. Core entities

### 2.1 Why Product, Style and Variant are three things

Three entities exist because three audiences hold three different truths.

- **Product** is what the *customer* sees: one page, one name, one story. Maps
  to a Shopify product, an Amazon parent, a Myntra style.
- **Style** is what the *factory* knows: a silhouette and construction, with
  dimensions, a tech pack, a supplier and a bill of materials.
- **Variant** is what the *warehouse and channels* transact: a SKU with a
  colour, a size, a barcode, a price and a stock count.

**POS-2.1** — A product MUST have at least one style. **Product-to-style is
one-to-one by default**, and implementations SHOULD create the style implicitly,
so the second entity costs the user nothing. A product MAY hold multiple styles
only when two distinct *constructions* are sold on one page. Marketing
convenience is not sufficient grounds.

> All 24 products in today's catalogue resolve 1:1. The style layer earns its
> place because Manufacturing and Repairs are owned domains (§1.1) and both
> address the build, not the listing. Were that untrue, this would define two
> entities.

### 2.2 The entity set

**Core (the ten named).**

| Entity | Role |
|---|---|
| `product` | Customer-facing unit. Name, story, category, brand, audience, SEO, status. Owns nothing physical. |
| `style` | Manufacturing unit. Construction, product dimensions, attributes, supplier, tech pack. |
| `variant` | Sellable unit. SKU, supplier SKU, colour, size, GTIN, status. **OD-2 lives here.** |
| `material` | Registry with a code; joined to style via `style_material` carrying part and percentage. |
| `colour` | Pure colour: name, 2-char code, channel family, hex. Texture is not a colour. |
| `image` | Immutable original plus renditions. Role, order, alt text, approval, licence, eligibility. |
| `collection` | Merchandising grouping. Many-to-many with product, ordered. Never a category. |
| `supplier` | Vendor identity, terms, lead time, MOQ, and the SKU-prefix rule for remapping their codes. |
| `inventory` | Quantity per variant per location, with reserved and safety stock. |
| `packaging` | Pack type, contents, package dimensions, gross weight, and the statutory block. |

**Supporting (required by the ten).**

| Entity | Role |
|---|---|
| `brand` | Code and defaults for HSN, GST, warranty, care, consumer-care contact. Cascades. |
| `category` | Department, code, name, `attribute_set_id`, per-channel category mappings. |
| `attribute_set` | Attribute definitions per category, **as data**. Lets footwear arrive without touching bags. |
| `copy` | Versioned text per product, channel family and locale. |
| `price_list`, `price` | Per channel or currency, with validity windows. |
| `channel`, `channel_listing` | Channel registry; per channel × variant external IDs, status, sync state. |
| `document` | Tech packs, test reports, certificates, claim evidence. Private storage. |
| `claim` | Claim text with evidence reference and verifier. |
| `repair` | Repair record against a variant, with parts and outcome. |
| `event` | Append-only change log with field-level diffs. The sync spine. |

---

## 3. Relationships

```
brand ──1:n──> product                      category ──1:n──> product
                 │                                    │
                 │                                    └─1:1─> attribute_set
                 ├──1:n──> style          (1:1 by default — POS-2.1)
                 │           ├──n:m──> material    via style_material {part, pct}
                 │           ├──n:1──> supplier
                 │           ├──1:n──> document    tech pack, test report
                 │           └──1:n──> variant     the sellable unit — OD-2
                 │                        ├──n:1──> colour        primary
                 │                        ├──n:0..1> colour       secondary
                 │                        ├──1:1──> packaging     statutory
                 │                        ├──1:n──> inventory     per location
                 │                        ├──1:n──> price         per price_list
                 │                        ├──1:n──> repair
                 │                        └──1:n──> channel_listing
                 ├──1:n──> copy            per channel family × locale
                 ├──1:n──> claim           evidence-backed
                 ├──n:m──> collection      via product_collection {position}
                 └──1:n──> image ←── also attaches to style or variant
                                owner_type ∈ {product, style, variant}
```

Rules the diagram cannot express:

- **POS-3.1** — An `image` MUST declare exactly one owner. A colour-specific
  photograph attaches to the **variant**; a construction detail shared across
  colourways to the **style**; a campaign frame to the **product**. Channel
  resolution walks variant → style → product, taking the first match per role.
- **POS-3.2** — `packaging` is one-to-one with `variant`, not style. A pack-of-1
  tote and a pack-of-5 combo declare different net quantities.
- **POS-3.3** — A `collection` MUST NOT express taxonomy. Category answers *what
  is this*; collection answers *what are we selling together*. One category per
  product; any number of collections.
- **POS-3.4** — Material composition MUST use `style_material` rows with a part
  (body, lining, trim, hardware) and optional percentage. Percentages within a
  part SHOULD sum to 100. Today's free-text `material` becomes the body part.
- **POS-3.5** — `channel_listing` is the only entity a consumer may write to.

---

## 4. Data model

### 4.1 Identifiers and how variants are keyed

*Answers open question 2 of the superseded file.*

- Every entity carries an immutable UUID surrogate key, `<entity>_id`.
- **`variant_id` is the system's internal identity.** Foreign keys, asset paths
  and API relationships use it.
- **`sku` is the human-facing natural key.** Unique, meaningful, and the address
  used in APIs (`/v1/variants/{sku}`) because it is what a person quotes.
- **POS-4.1** — Asset paths MUST key on `variant_id`, never on SKU. Today's
  `products/<SKU>/1.jpg` couples storage to a business identifier; existing
  paths MUST remain readable indefinitely.

### 4.2 SKU grammar — normative

The existing six-segment grammar is ratified unchanged, because 24 live SKUs and
every supplier purchase order already depend on it.

```
YS   W    TO    0069   P    CB
│    │    │     │      │    └─ colour     2 chars, from the colour registry
│    │    │     │      └────── material   1 char
│    │    │     └───────────── style no.  4 digits, running per brand+category
│    │    └─────────────────── category   2–3 chars
│    └──────────────────────── gender     W · M · U · K
└───────────────────────────── brand      2 chars

separator: none          length: 11–12 characters
```

- **POS-4.2** — A SKU is generated from the six segments and is unique across the
  active catalogue. `decodeSku` MUST remain able to reverse any generated SKU;
  this property is what makes migration (§9) near-automatic.
- **POS-4.3** `[AMD-01]` — *Proposed:* an issued SKU is immutable forever, and
  uniqueness extends across all time including archived variants, checked
  against an issued-SKU ledger. Today a manual SKU is freely editable.

### 4.3 Supplier SKU mapping

Ratified; already implemented and pending merge as PR #2. The supplier's leading
brand characters — count configured per supplier, default 2 — are replaced by our
brand code; every remaining character is preserved exactly. `AB1234XYZ` becomes
`YS1234XYZ`. The original MUST be retained in `supplier_sku`.

### 4.4 Storage and where it runs

*Answers open question 1.*

- **POS-4.4** — The POS runs on the existing Supabase Postgres project and the
  existing React application, extended. No new service, no queue, no separate
  PIM deployment.

Justification: free-tier-only is a standing constraint, and the current stack
already provides row-level security with an allow-list function, realtime
row-level sync, presence, auth with invited users, storage with a deliberately
public image bucket, and idempotent re-runnable migrations. Replacing that to
gain nothing the business needs would be the overengineering this project has
been told to avoid.

- **POS-4.5** — A real table is created only when a field is queried, joined or
  synced. Everything else stays `jsonb`. Attribute *definitions* live in tables;
  attribute *values* live in `jsonb` on the style. Full EAV is forbidden.
- **POS-4.6** — `catalogue_settings` MUST be decomposed. Today brands,
  categories, materials, colours, SKU rules, export preferences and custom
  formats share one row, autosaved on a 700 ms debounce with last-write-wins;
  two editors changing different settings silently lose one of the changes.

### 4.5 Naming conventions

- Table names are singular `snake_case`: `variant`, `channel_listing`.
- Join tables name both sides alphabetically: `product_collection`.
- Primary keys are `<entity>_id`; foreign keys keep the referenced name.
- Booleans read as assertions: `is_`, `has_`, `allow_`. Never `flag`.
- Timestamps end `_at`; dates `_on`; durations `_days`, `_months`.
- **Measures carry their unit in the name**: `net_weight_g`, `length_cm`,
  `price_inr`. No field stores a unit; `weight_unit` is abolished. `[AMD-08]`
- Enums are lowercase kebab-case strings, not integers: `croc-embossed`.
- No abbreviations except established `sku`, `hsn`, `gst`, `gtin`, `mrp`.

### 4.6 Colour naming — corrective `[AMD-03]`

*Proposed.* A colour names a colour only; texture and print move to `finish`
(`smooth · croc-embossed · knit-effect · pebbled · patent · woven`). The registry
currently violates this with `Croco Black/Brown/Maroon/Olive/Yellow`.

The live data also contradicts itself: the registry maps `CO` to Coral and `CV`
to Croco Olive, while issued SKUs use `CO` for Croco Olive. **Issued SKUs
stand.** Resolution: retire `CO` from the registry for new issue, record it as a
legacy alias meaning Olive + croc-embossed, and never reassign it.

### 4.7 Folder structure

**Repository** — organised by layer, so a file's location states its layer.

```
catalogue-studio/
├── docs/
│   ├── product-operating-system.md   this document — the constitution
│   └── decisions/                    one file per architectural decision
├── db/
│   ├── migrations/                   numbered, forward-only
│   └── seed/                         colours, materials, categories
├── src/
│   ├── core/          entities, invariants, SKU grammar, validation
│   ├── enrich/        media, copy, SEO, claims, documents
│   ├── commerce/      price lists, inventory, cost
│   ├── channels/      one folder per channel
│   │   ├── _shared/   mapping, budgets, transport, hashing
│   │   ├── shopify/   mapping · validate · transport
│   │   ├── amazon/    myntra/ flipkart/ meesho/ ajio/ ondc/
│   ├── outputs/       sheets, feeds, PDF, website payloads
│   ├── compat/        flatView() — the migration bridge (§9)
│   └── ui/            unchanged by this specification
└── scripts/           backup, restore, rehost, migration runners
```

- **POS-4.7** — A channel folder MUST contain only mapping, validation and
  transport. Business rules MUST NOT live under `channels/`; a rule needed by two
  channels belongs in `core/`. This is the structural defence against
  per-channel logic quietly becoming the real data model.

**Asset store.**

```
product-images/                   public bucket — marketplaces fetch anonymously
├── originals/{variant_id}/{asset_id}.jpg     immutable, EXIF stripped
├── renditions/{variant_id}/{asset_id}/
│   ├── main-2000.jpg       pure white, padded — Amazon main
│   ├── square-1200.jpg     Shopify, website grid
│   ├── portrait-1440.jpg   Myntra 3:4
│   └── thumb-400.jpg
└── legacy/products/{SKU}/1.jpg   pre-migration paths, preserved

documents/                        PRIVATE bucket
└── {style_id}/                   tech packs, test reports, claim evidence
```

- **POS-4.8** — Documents, claim evidence and test reports MUST live in a private
  bucket. Only image originals and renditions are public, because only those need
  anonymous marketplace fetches. Cost and margin MUST NOT appear in any public
  path.

---

## 5. Field classes

Five classes. Every field belongs to exactly one.

**POS-5.1** — Every field has exactly one owning entity. If two entities appear
to need it, one needs a *reference*, not a copy. This is the rule that prevents
`amazon_title`, `myntra_title`, `meesho_title`.

### 5.1 Universal

One correct value across every channel. Facts about the physical object:
dimensions, net weight, material composition, colour, finish, HSN, GST rate,
warranty, care, GTIN, package contents, statutory declarations. If two channels
disagree, one is wrong.

Owner map: `product` holds classification, audience, tax, service and SEO;
`style` holds construction, product dimensions and attributes; `variant` holds
identity, variant axes and cost; `packaging` holds the shipped unit and statutory
block.

### 5.2 Channel-shaped

One source, many renderings. Copy, titles, bullets, images, category, price. The
*substance* is universal; the *shape* is per channel — Amazon's five bullets and
Meesho's one line describe the same bag. Store substance once; the adapter cuts
it to a declared budget.

**POS-5.2** — An override is permitted where a channel genuinely needs a
different value, MUST carry a reason string, and MUST be surfaced as an explicit
deviation. An override MUST NOT work around a missing universal field; the
correct response is to add the field.

### 5.3 Channel-owned

The channel is the author: ASIN, Shopify IDs, Myntra style ID, listing status,
rejection reason, channel category ID, commission. Stored only in
`channel_listing`. We record; we never author.

### 5.4 Computed — pure functions, never persisted

| Field | Definition |
|---|---|
| `margin_pct` | `(selling − cost_landing) / selling × 100` |
| `available_qty` | `quantity_on_hand − reserved`, floored at 0 |
| `volumetric_weight_g` | package dimensions ÷ divisor |
| `billable_weight_g` | `max(gross_weight_g, volumetric_weight_g)` |
| `completeness_pct` | filled ÷ required for the product's category |
| `channel_readiness` | per channel: required fields satisfied, validations passed |
| `display_title` | `{brand} {product_name} — {colour}{, size}`, trimmed per channel |
| `price_effective` | price for a channel at a date, resolving validity windows |
| `sku_source` | `generated` \| `typed` \| `supplier-mapped` |
| `missing_fields` | required set minus filled |

**POS-5.4** — `margin`, `sku_source` and `missing_fields` are today declared
computed yet written into every row as empty strings and recomputed at read —
two sources of truth, one always blank. They MUST NOT exist as columns after
migration.

### 5.5 Generated — artefacts with provenance

Persisted, because producing them is expensive or non-deterministic. Distinct
from computed.

| Artefact | Regeneration policy |
|---|---|
| `sku` | **Never.** Frozen at issue. Regeneration is a new variant. |
| `slug` | Frozen once published; a change MUST leave a redirect. |
| image renditions | Freely, idempotently. Originals never regenerated. |
| background-removed cutout | Freely; tolerance stored so a result is reproducible. |
| listing set | Freely; provenance records the source photograph. |
| copy draft | Freely, but MUST NOT reach a channel without human approval. `[AMD-07]` |
| channel payload | On input change; hash decides whether a push follows. |
| feed file, PDF catalogue | Freely. Disposable output. |
| packaging artwork data | Blocked once artwork is sent to print; versioned instead. |

- **POS-5.5** — Every generated artefact MUST store the generator identity, its
  version, a timestamp and a hash of its inputs. An artefact that cannot name
  what produced it MUST be treated as authored content and preserved.
- **POS-5.6** — A generated artefact MUST be rebuildable from stored fields
  alone. If deleting it loses information, it was authored, not generated, and
  belongs in the record.

### 5.6 Statutory — required, not user-editable

India's Legal Metrology (Packaged Commodities) Rules govern pre-packaged goods.
ONDC transmits these as a dedicated statutory block; Amazon and Flipkart require
a subset. **None of these fields exist today**, which is why ONDC is not merely
unbuilt but unreachable.

| Field | Declaration |
|---|---|
| `country_of_origin` | ISO code. `IN` for made-in-India. |
| `manufacturer_name`, `manufacturer_address` | Legal entity and address as printed. |
| `packer_name`, `packer_address` | Where packer differs from manufacturer. |
| `importer_name`, `importer_address` | Imported goods only. |
| `net_quantity` | With unit — `1 N`, `5 N`. Per variant, not style. |
| `manufacture_month_year` | `MM/YYYY`, per production batch. |
| `mrp_inclusive_of_taxes` | Declared retail price inclusive of all taxes. |
| `consumer_care_name`, `_email`, `_phone` | Monitored complaint channel. |
| `generic_name` | Commodity name — `Handbag`, not `Aria Tote`. |
| `is_returnable`, `return_window_days`, `is_cancellable` | ONDC requires explicit declaration. |
| `time_to_ship` | ISO 8601 duration, e.g. `P2D`. ONDC. |

- **POS-5.7** — Statutory fields SHOULD default from brand and supplier and MAY
  be overridden per packaging row. This is architecture.
- **POS-5.8** `[AMD-04]` — *Proposed:* a variant whose statutory block is
  incomplete cannot reach `published` for any channel, regardless of that
  channel's own requirements.

> **Verification duty.** This section is written from the requirement shapes
> these platforms publish, and requirements change. Before any launch the
> statutory block MUST be reconciled against current seller-portal documentation
> and, for Legal Metrology, confirmed with a compliance adviser. This document
> defines where data lives; it is not legal advice.

---

## 6. Workflows

Seven states, each with one owner, one entry gate and a defined validation set.
**Validation strictness rises with state** — an idea may be almost empty; a
published product may have no gaps.

**POS-6.1** — The existence of states, owners and an event-logged transition
history is architecture. **What each gate refuses is a business rule**, so every
gate below is a proposal under `[AMD-04]`. Today there is no publication concept:
export is always permitted and the health check is advisory by explicit design.

| State | Owner | Gate in | Gate out |
|---|---|---|---|
| `idea` | buyer / founder | A name and a category. Nothing else validated. No SKU issued. | — |
| `product` | merchandiser | — | Category attribute set satisfied; dimensions, weights, materials, GTIN present; SKU issued and unique |
| `photography` | photographer | Variant exists with a SKU, so assets have somewhere to attach | Minimum set `main`, `back`, `inside` present and approved |
| `content` | copywriter | — | Copy within every target channel's budget; every claim evidenced; no duplicate description; listing-hygiene rules pass |
| `qa` | brand owner | Photography and content both complete | `channel_readiness` true for at least one channel; statutory block complete; prices set with MRP ≥ selling; AI copy human-approved |
| `published` | system | QA passed **for that specific channel** | — |
| `archived` | merchandiser | Inventory zero or written off; every channel listing de-listed | — |

- **POS-6.2** — `photography` and `content` MAY run concurrently and MUST NOT
  block one another. Implementations SHOULD model state per work-stream rather
  than as one linear field.
- **POS-6.3** — Every transition MUST be recorded in the event log with actor,
  timestamp, from-state and to-state. A QA rejection MUST record the failing rule
  identifiers.
- **POS-6.4** — Strictness is a function of target state, not user action. The
  same product MUST be saveable with gaps in `idea` and unsaveable with those
  gaps in `qa`. **Never block a save; block a transition.**
- **POS-6.5** — Publication is per channel. A product MAY be live on Shopify and
  unpublished on Amazon.

### 6.1 Asset lifecycle

| State | Owner | Gate |
|---|---|---|
| `ingested` | photographer | File type allowed, long edge ≥ 1000 px, checksum not already present |
| `processed` | system | Every declared rendition produced without error |
| `assigned` | merchandiser | Exactly one role; no duplicate role at same owner and order |
| `approved` | brand owner | Alt text present for `main`; white-background check passed `[AMD-05]` |
| `published` | system | Referenced in a payload. **Immutable and undeletable in this state.** |
| `superseded` | merchandiser | Replacement exists, approved, same role |
| `archived` | system | Zero live references for 90 days |
| `purged` | owner only | Explicit owner action with a recorded reason. Never automatic. |

- **POS-6.6** — The uploaded original MUST be retained unmodified at the highest
  resolution supplied, with EXIF location stripped. Channel-facing images are
  renditions. A rendition MUST NOT be generated from another rendition.
- **POS-6.7** `[AMD-11]` — *Proposed retention:* originals for commercial life
  plus 7 years; claim evidence for as long as the claim has ever been published.
  Renditions MAY be purged at any time, being regenerable.

### 6.2 Image roles

| Role | Content | Owner | Required |
|---|---|---|---|
| `main` | Front, pure white RGB 255,255,255, no shadow, padded | variant | yes |
| `back` | Rear elevation, white | variant | yes |
| `inside` | Open, showing lining and compartments | variant | yes |
| `side` | Profile showing depth | variant | no |
| `detail` | Hardware, stitching, texture | style | no |
| `scale` | Worn or held, establishing size | variant | no |
| `lifestyle` | Styled in context | product | no |
| `swatch` | Flat colour or material close-up | variant | no |
| `size_chart` | Measurement diagram | style | no |

Roles and owners are architecture. The **minimum publishable set** is a business
rule: today the health check only warns below three images. `[AMD-05]`

### 6.3 Media licensing

*Answers open question 5, licensing half.*

- **POS-6.8** — Every `image` MUST carry `licence` ∈ `owned` · `licensed` ·
  `ai-generated`, with `licence_expires_on` where applicable and
  `licence_document_id` for licensed assets.
- **POS-6.9** — An `ai-generated` asset MUST NOT be used as claim evidence, in a
  statutory context, or as the `main` image of a variant whose real photograph
  does not exist. AI may relight and reposition a real product; it MUST NOT
  originate product appearance.

---

## 7. Integration contracts

### 7.1 Publication model

*Answers open question 3.*

**POS-7.1** — The POS publishes **pull-first, with optional push**. It exposes
hash-addressed projections that consumers read; webhooks notify consumers that a
projection changed. File export is retained for channels with no API.

Justification: a pull model needs no outbound credentials for channels that
cannot receive them, degrades safely when a consumer is down, and costs nothing
to operate on a free tier. Push is added per channel where the channel's API
requires it.

### 7.2 Read contracts

| Contract | Purpose |
|---|---|
| `GET /v1/products?updated_since=&status=&cursor=` | Paginated products with nested styles and variants. Cursor-based, stable ordering, `ETag` per product. |
| `GET /v1/variants/{sku}` | One variant fully resolved: style, product, colour, materials, packaging, statutory block, media, computed fields. |
| `GET /v1/variants/{sku}/media?role=&channel=` | Renditions filtered by role and channel eligibility, in sort order, with alt text. |
| `GET /v1/channels/{channel}/feed?since=&cursor=` | Materialised payload per variant — mapped, validated, budget-trimmed. Carries `payload_hash`. |
| `GET /v1/channels/{channel}/readiness` | Which variants are publishable; for those that are not, the failing rule identifiers. |
| `GET /v1/channels/{channel}/export?format=xlsx\|csv` | The same projection as a file. Preserves today's spreadsheet workflow unchanged. |

### 7.3 Write-back — the only inbound path

| Contract | Purpose |
|---|---|
| `PUT /v1/channels/{channel}/listings/{sku}` | Records external IDs, listing status, rejection reasons, sync time. Writes `channel_listing` only. **Rejected if the body contains any universal field.** |
| `POST /v1/inventory/adjustments` | Idempotent stock movements keyed by `Idempotency-Key`. Deltas preferred for concurrent writers. |

### 7.4 Events

Signed webhooks: `product.updated` · `variant.created` ·
`variant.price.changed` · `inventory.changed` · `media.approved` ·
`listing.rejected` · `product.archived`. Payloads carry entity ID, changed field
list and the new hash. At-least-once delivery; consumers MUST be idempotent.

### 7.5 Cross-cutting rules

- **POS-7.2** — Every write MUST accept an `Idempotency-Key` and MUST return the
  original result on replay. Marketplace integrations retry; a duplicate stock
  adjustment is a real and expensive failure.
- **POS-7.3** — Errors MUST return the failing rule identifier from this
  document, the field path and a human-readable message. `"validation failed"`
  is non-conforming.
- **POS-7.4** — No endpoint may expose `cost_landing` or `margin_pct` to a
  channel-scoped credential. Enforced at the API boundary as well as in storage
  policy.
- **POS-7.5** — Projections are materialised per channel with `payload_hash`. A
  feed run MUST compare hashes and skip unchanged variants.

### 7.6 Consumer conformance

Requirements **on downstream systems**, generalised from the two rules that
survive the website's superseded section.

- **POS-7.6** — No downstream system's types may leak upward into a consumer's
  own presentation layer. A consumer defines its own shapes; adapters map onto
  them. This holds for POS types as much as for Shopify's.
- **POS-7.7** — No downstream system's identifier may become a public URL.
  Handles are ours. Shopify GIDs and POS UUIDs stay internal.
- **POS-7.8** — A consumer MUST treat POS data as read-only and MUST NOT
  round-trip an edit. A consumer that needs a different value requests an
  override (POS-5.2).
- **POS-7.9** — A consumer MUST tolerate a field it does not recognise. Adding a
  field to the POS MUST NOT break a consumer.

### 7.7 Shopify's position

*Answers open question 4.*

**POS-7.10** — Shopify **remains the commerce engine** for the direct channel —
checkout, payments, orders, customers, carts — and is **not** the product master.
It is authoritative for transactional state (§1.2) and a consumer for product
data (§1.1).

This split is what makes checkout integration permitted work under OD-6 while
product data still flows one way. Should Shopify later be replaced as the
commerce engine, nothing in §1.1 moves.

### 7.8 How the website consumes

*Answers open question 8.*

**POS-7.11** — The website SHOULD take a **build-time snapshot** of catalogue
data — products, copy, media, collections, SEO — and read **live** only price and
availability.

Justification: the storefront is statically hosted, so a snapshot keeps it fast
and keeps it up when the POS is down; price and stock are the only fields whose
staleness costs a sale or oversells. The existing single-module seam in the
website (`lib/catalog.ts`) is where this lands — a change to function bodies, not
to page components. That seam is a fact about the consumer, not an input to this
design.

### 7.9 Inventory truth

*Answers open question 6.*

**POS-7.12** — The POS holds inventory truth. Channels receive an availability
figure, not an allocation.

Start with a **single pool with a per-channel buffer** rather than per-channel
allocation: allocation strands stock across channels and needs rebalancing
nobody has time to do at this volume. Move to allocation only when measured
oversell justifies it.

### 7.10 Marketplace mappings

*Answers open question 7.*

**POS-7.13** — Mappings are expressed as **data, not code**: a `channel` row, a
field mapping (already implemented as saved export formats), a category mapping
per channel, an attribute mapping per category × channel, and `channel_listing`
for per-variant state. A new channel MUST be onboardable without a deploy —
today's format builder already achieves this for file channels.

---

## 8. The eight open questions, answered

The superseded file listed eight things not to assume. Each is now decided.

| # | Question | Decision | Rule |
|---|---|---|---|
| 1 | Where it runs, what it is built on | Existing Supabase Postgres + existing React app, extended. No new service. | POS-4.4 |
| 2 | Data model, identifiers, variant keying | UUID surrogate keys; `variant_id` internal, `sku` the human-facing natural key; assets keyed on `variant_id`. | POS-4.1 |
| 3 | Push, pull, or both | Pull-first with hash-addressed projections; webhooks notify; push per channel where required; file export retained. | POS-7.1 |
| 4 | Shopify: commerce engine or one channel | Both — commerce engine for the direct channel, consumer for product data. Never the product master. | POS-7.10 |
| 5 | Media and AI assets: storage, versioning, licensing | Immutable originals + derived renditions; provenance on every generated artefact; explicit `licence`; AI may not originate product appearance. | POS-5.5, POS-6.6, POS-6.8 |
| 6 | Which system holds inventory truth | The POS. Single pool with per-channel buffer, not allocation. | POS-7.12 |
| 7 | How marketplace mappings are expressed | As data: channel, field mapping, category mapping, attribute mapping, listing state. No deploy to onboard. | POS-7.13 |
| 8 | Does the site snapshot or read live | Snapshot the catalogue at build; read price and availability live. | POS-7.11 |

---

## 9. Migration strategy

The enabling fact: **the SKU is a decodable string and `decodeSku` already
reverses it.** Brand, gender, category, style number, material and colour are
recoverable from `YSWTO0069PCB` programmatically, so the style/variant split —
the largest change here — is largely automatic.

**POS-9.1** — The compatibility bridge is mandatory. `compat/flatView(variant)`
MUST return the current 50-key product shape assembled from the new entities.
Every existing adapter, export, health check and screen MUST keep working
against it, unchanged, until each is migrated deliberately. **Phases 2–7 change
storage without changing behaviour.**

| Phase | Work | Acceptance |
|---|---|---|
| **0** Prerequisite | Restore backups. Set `BACKUP_REPO_TOKEN`; change the two soft `exit 0` skip paths to hard failures. | A backup lands in the private repo; a deliberately broken run opens an issue |
| **1** Data entry | Carry universal and statutory columns in the pending bulk upload: GTIN, country of origin, manufacturer, packer, net quantity, package dimensions, gross weight, consumer care. | Statutory completeness report shows zero gaps |
| **2** Automatic | Derive products, styles, variants. Group by brand + gender + category + style number via `decodeSku`. Conflicting style-level values **reported, never guessed**. | Variant count equals pre-migration product count; zero unreported conflicts; `flatView` output byte-identical per SKU |
| **3** Manual, bounded `[AMD-03]` | Reconcile identity. Fix the colour registry; retire `CO` for new issue as a legacy alias. Resolve SKUs failing `decodeSku` — the existing health check already produces this worklist. | Every non-archived variant decodes, or is explicitly marked legacy with a reason |
| **4** Automatic | Media to its own table. Read `imageUrl1–5` plus a Storage listing per SKU; slot 1 becomes `role=main`, rest `gallery` in slot order. Legacy paths preserved. | Every previously reachable image URL still resolves |
| **5** Automatic | Split copy, price, inventory, packaging. Copy → one version at channel family `default`. MRP/selling → `default` price list; landing → cost. Unit conversions **blocked pending `[AMD-08]`**. | No price or tax value differs once unit conversion is applied |
| **6** Automatic | Re-point every adapter at `flatView`. Drop the three computed-but-stored columns. **No adapter rewritten.** | Every export and the full health check produce identical output before and after |
| **7** Automatic | Move `laptop`, `compartment`, `water`, `pattern` into the Bags attribute set; introduce the attribute-set registry. | A second category can be added with its own attributes and no schema change |
| **8** New build | Channel state and the first API channel. Create `channel` and `channel_listing`, seeded from saved formats. Take **Shopify** first — its product/variant model matches the new core most closely. | One product round-trips: pushed, external ID recorded, a field edited, only the changed variant re-pushed on hash difference |

**POS-9.2** — Phase 8 MUST NOT begin until phase 6 is accepted. An API sync
written against the flat row would have to be written twice.

### 9.1 What is deliberately not built

An architecture is as much what it refuses. Each has a reserved seam and nothing
more: CRM and analytics warehouse; full EAV; multi-currency and multi-locale
(columns carried, one value populated); a workflow engine beyond a status field;
bill of materials beyond a supplier reference; microservices, queues or a
separate PIM service; the ONDC adapter itself — statutory *fields* now, adapter
when onboarding actually happens.

Repairs and Manufacturing are **owned domains** (§1.1) but only their identity
and reference fields are built in v1.0: `supplier`, `document`, `repair`. Their
workflows are out of scope until a product is listed and selling.

---

## 10. Amendment register

Business rules this specification would change. Each states the rule **as it
operates today** with its evidence, what is proposed, and what approving costs.
**None may be implemented until approved.** Architecture proceeds without them.

| ID | Rule today, and its evidence | Proposed | Cost of approving |
|---|---|---|---|
| **AMD-01** | **A SKU can be edited.** Ticking "manual" sets `skuLocked` and makes the SKU a free text input; nothing prevents changing it later. Archival does not exist, so a deleted SKU's code is immediately reusable. | Issued SKUs immutable forever; an issued-SKU ledger prevents reuse after archival. | Lose in-place typo correction. Needs the ledger. Protects supplier POs, printed labels and marketplace records from silent drift. |
| **AMD-02** | **Products can be deleted** — one, many, or all via "Clear all products", each behind a confirm. History keeps a log entry but not the data. Used deliberately on 5 Sep. | Archive with a reason; physical deletion reserved to the owner for regulatory erasure and duplicates. | The bulk-clear workflow you used would no longer exist in that form. |
| **AMD-03** | **Colour is free text, auto-registered** with a generated 2-char code. `Croco Black/Brown/Maroon/Olive/Yellow` are legitimate colours. | Colour names a colour only; texture moves to `finish`. `CO` retired for new issue as a legacy alias. | Ten of 24 live variants have their colour restated. Issued SKUs untouched. **Resolves a live contradiction.** |
| **AMD-04** | **Nothing blocks publication.** There is no publication concept — export is always allowed. The health check and readiness report are advisory, and the code says so: *"treat this as a pre-flight check, not gospel."* | A variant cannot reach `published` for a channel unless readiness passes and the statutory block is complete. | Converts advice into a gate. Someone will be blocked from shipping a listing they judge fine. **The decision that most changes how the team works.** |
| **AMD-05** | **Images warn, never block.** "Fewer than 3 images" is advice. Slots are positional with no roles. Four combo-set products have no image at all. | Minimum set `main`, `back`, `inside`, each approved by a named person. | Those four cannot publish until photographed. Adds an approval step per image. |
| **AMD-06** | **No claim concept exists.** Any text may be written and exported — how "eco-friendly construction" and "reflective details" came to sit on all 24 PU handbags with no basis. | Material claims require an evidence reference and a verifier before publication. | New obligation on whoever writes copy; evidence must be stored. Prevents a repeat of a real incident. |
| **AMD-07** | **AI copy is immediately publishable.** `draftCopy` parses model JSON straight into `about`, `benefits`, `f1–f3`; the row exports at once. | AI text is a draft until a named human approves it, with approver and timestamp. | One step per product. Justified by measurement: gemma3:4b broke the required output format on 24 of 24 products. |
| **AMD-08** | **Units and types as they stand.** GST as a fraction (`0.18`); warranty free text (`"domestic 6months"`); weight as amount + `weightUnit` of KILOGRAM or GRAM. | GST as percentage (`18.00`); `warranty_months` integer; grams only, `weight_unit` abolished. | One-time automatable conversion. Adapters must re-render per channel — Flipkart's "Tax Code (GST)" and Myntra's "GST %" differ. **Verify no channel receives a changed value.** |
| **AMD-09** | **You control the required-field list.** `DEFAULT_REQUIRED` is a flat 29-field list editable under Brands & SKU rules → Completeness. Any requirement can be switched off. | Three tiers: universal required, per-category required, and a statutory block that is **not** user-editable. | Lose the ability to switch off a statutory requirement. Everything else stays configurable. |
| **AMD-10** | **Product name is free text**, falling back to the first item of `contents`. Today every row is "Tote Bag" or "Shoulder Bag". | An authored noun phrase excluding colour, size, brand, price, promotional words; channel titles computed. | All 24 need a real name written. Unblocks a computed title fitting each channel's budget. |
| **AMD-11** | **No retention policy.** Backups keep the newest 30 files; images kept indefinitely with no stated basis. | Originals for commercial life + 7 years; claim evidence while ever published. | Storage cost on a free tier — the only amendment here that spends money. Renditions stay purgeable, so the cost is originals alone. |
| **AMD-13** | **The Material Ladder stays in the repository**; Ch.16 doctrine, and the lifespans "carry legal weight". | Split doctrine from instance: the **Ladder** (permitted materials, lifespans, claims) stays Brand Bible doctrine; the POS holds material records and per-style composition, **validated against the Ladder**. The POS never redefines a material. | Needs the Ladder expressed machine-readably once. Resolves POS ownership of Materials against existing doctrine without weakening either. |
| **AMD-14** | **"Shopify owns what a merchandiser edits."** `yselle/docs/admin-first-architecture.md`. | Superseded in part by OD-3: Shopify owns no product data. The "repository owns what the Brand Bible decides" half survives. | Merchandiser edits move from Shopify Admin into the POS. Requires the POS editor to be at least as usable for that task before the change lands. |
| AMD-12 | **Cost is already withheld from channels** — `landing` is mapped by no adapter. A convention, not enforced. | Enforced at the API boundary and in storage policy. | None. **No approval required** — strengthening, recorded for completeness. |

### 10.1 How to approve

Reply with the IDs you accept, reject, or want changed. Approved amendments are
folded into the body of this document and the register records date and approver.
Rejected ones are struck, and the affected rules revert to today's behaviour —
which in every case above is the more permissive option.

**Recommended order.** **AMD-04 first**: it changes how the team works day to
day, and AMD-05, -06 and -07 only bite because publication becomes a gate.
Reject AMD-04 and those three become advisory warnings costing almost nothing.
**AMD-01 and AMD-03 are urgent regardless**, because they concern identifiers
that are already drifting. **AMD-13 and AMD-14 need a decision before any POS
editor work**, because they determine what the POS is allowed to be
authoritative about.

---

## 11. Change control and versioning

| What | Scheme | Rules |
|---|---|---|
| This specification | semver — v1.0 | Patch: clarification. Minor: additive, backward-compatible. Major: an invariant or a MUST changes, and MUST record the migration it implies. |
| Database schema | numbered, forward-only | Sequential, idempotent, re-runnable — extending the existing `setup.sql` idiom that already carries `v4` and `v5` sections. No down-migrations. |
| Copy | row versions | Every edit writes a new version with author and timestamp; publication references a specific version, so a live listing traces to exact text. |
| Prices | validity windows | Never updated in place. A change closes `valid_to` and inserts a new row. Price history is free. |
| Images | immutable + supersede | Originals never overwritten. A replacement marks the old one superseded. |
| Channel payloads | content hash | Not versioned. Identified by input hash. |
| APIs | path major — `/v1/` | Additive within a major. Removing or retyping a field needs a new major and one release of deprecation. |
| Field deprecation | deprecate, then remove | Marked with the version that removes it; MUST survive one minor release. Reads work; writes warn. |

- **POS-11.1** — Amendments are proposed as a pull request against
  `docs/product-operating-system.md` stating the rule changed, the reason and the
  migration required. An implementation MUST NOT deviate from a ratified rule
  without an accompanying amendment. **A code comment is not an amendment.**
- **POS-11.2** — This document supersedes
  `yselle/docs/product-operating-system.md` on approval. That file becomes a
  pointer to this one. Per OD-8, there MUST NOT be two versions.
- **POS-11.3** — No code may be written against this specification until it is
  approved.

---

## Appendix A — current state, for the record

Audited at `catalogue-studio@a182231`: 2,346 lines across 26 files, 24 products
in one brand.

**Reusable as-is, and promoted by this specification.** The validation engine
(25+ rules including marketplace hygiene: ALL-CAPS rejection, promotional
wording, contact details, GST slabs, HSN digit lengths, duplicate descriptions);
the adapter builder (ingests a marketplace's own template, scores the header row,
auto-maps via 40 regexes, saves named formats — a non-developer onboards a
channel without a deploy); the SKU grammar with `decodeSku`; the audit log with
field-level diffs; brand-level defaults cascading onto products; the idempotent
versioned migration idiom; the non-empty-wins import merge; the offline image
pipeline; row-level realtime with presence; the dual local/Supabase backend; and
the backup guardrails that refuse a zero-product or halved dump.

**Structural gaps this specification closes.** No variant model — every
colourway is an independent top-level row, blocking Shopify, Amazon variation
families and Myntra's style hierarchy simultaneously. A universal attribute list
asked of 95 defined categories, though `laptop`, `compartment` and `water` are
bag-specific. No channel state whatsoever — no external IDs, status or sync
memory. No inventory. No statutory fields. Single-valued copy and no SEO fields.
Product dimensions doubling as shipping dimensions. Three computed fields stored
as permanently-empty strings. Nineteen of thirty-six channel field groups absent.

**Known defect in a reused component.** `BACKUP_REPO_TOKEN` is not set, so the
backup step prints `no BACKUP_REPO_TOKEN secret -> backup skipped` and exits
zero. The workflow reports success hourly while backing up nothing and never
opens an issue. Phase 0 of §9 fixes this first.
