# Phase 1 historical / visual art review

Status: **review draft for the Phase 1 art gate**  
Scope: current Boii / Late La Tène Stream Valley benchmark only.  
This document distinguishes archaeological support from project interpretation. A visually plausible reconstruction is not recorded as archaeologically proven unless the cited evidence supports that level of specificity.

## Review scale

- **SUPPORTED** — the broad visual choice is directly consistent with evidence from Late La Tène Bohemia/Moravia or a closely relevant Central-European source.
- **PLAUSIBLE / NOT PROVEN** — suitable as restrained art direction, but the current exact form is not demonstrated by the cited evidence.
- **REVISE / KEEP WIP** — useful as a benchmark candidate but should not be accepted as final historical production art yet.

## Settlement composition

**Status: SUPPORTED at the composition level; exact reconstruction remains open.**

Late La Tène sites in Bohemia provide evidence for settlements containing differentiated residential and economic buildings, enclosed farmsteads/homesteads, paths and specialised production. Stradonice is described as containing enclosed farmsteads with economic and residential buildings and specialised production. Hrazany likewise contained enclosed homesteads with residential and economic buildings, some with stone foundations. At Staré Hradisko, farmsteads were densely arranged and connected by frequently paved paths. Němčice provides evidence of sunken huts used, among other things, for craft production, with structures separated by corridors interpreted as paths.

The Phase 1 choice to show a dwelling, storage building and craft shelter around a readable path/working clearing is therefore a reasonable settlement-language abstraction. It must not be labelled as a literal reconstruction of one excavated farmstead without a site-specific plan.

**Art action:** retain differentiated dwelling/storage/craft functions and readable work circulation. In later polish, introduce restrained enclosure/fence/work-yard cues only when they improve RTS readability; do not turn the benchmark into a generic medieval village.

## Dwelling candidate

**Status: PLAUSIBLE / NOT PROVEN.**

Rectangular above-ground and sunken buildings are documented in the La Tène record. Published evidence from Bohemian enclosures includes an above-ground building around 4.35 × 6.10 m and sunken houses; Hrazany also documents residential and economic buildings, some with stone foundations. This supports a rectangular timber-based domestic vocabulary in broad terms.

The current dwelling candidate is not historically accepted merely because its silhouette is rectangular. Its exact wall build-up, roof pitch, doorway, daub coverage, stone use and dimensions require a reconstruction-specific comparison. The present model is also a high-density candidate (~99k triangles, no LOD), so historical review and production optimization should be handled together rather than treating it as final art.

**Art action:** keep as benchmark candidate. Before final acceptance, compare wall/roof/entrance details against a documented Bohemian/Moravian Late La Tène reconstruction or excavation-derived publication and prepare at least one lower-detail production LOD/replacement path.

## Storehouse candidate

**Status: PLAUSIBLE / NOT PROVEN.**

Economic buildings and storage features are well supported at Late La Tène settlements, but the current specific raised small-storehouse form has not been demonstrated by the sources reviewed here. Its use is acceptable as a functional RTS shorthand only while it remains explicitly labelled a project-owned WIP candidate.

**Art action:** keep the small economic-building silhouette and clear scale contrast with the dwelling. Do not describe the raised construction, exact wall system or roof solution as an archaeologically established Boii storehouse until a direct structural parallel is cited.

## Carpentry / workshop shelter

**Status: SUPPORTED for craft activity; PLAUSIBLE / NOT PROVEN for the exact open-sided shelter.**

Specialised production is strongly supported in Late La Tène central sites: Stradonice records specialised production, Třísov records iron working, metal casting, glassmaking and minting, and Němčice has production facilities and sunken huts used in craft contexts. A visible working zone is therefore historically appropriate to the settlement fantasy.

The exact open-sided carpentry shelter, bench, trestles and arrangement of tools are project interpretation. They should remain restrained and practical. The current axe/chisel/gouge-like silhouettes are acceptable as generic woodworking shorthand but are not, by themselves, proof of one specific workshop layout.

**Art action:** retain the craft-zone function and exposed construction. Avoid sawmill machinery, medieval joinery clichés, masonry workshops or oversized decorative tools. Keep props subordinate to silhouette/readability until a direct Late La Tène workshop/tool assemblage is used for detailed dressing.

## Inhabitants and clothing

**Status: READABILITY PROTOTYPE ONLY — production historical acceptance not met.**

The current five inhabitants correctly establish human scale and settlement occupation, but they are static 1,404-triangle vertex-colour prototypes. This is intentionally below the production brief (25k–50k triangles, one 2K atlas) and does not satisfy final character art requirements.

Central-European Iron Age textile evidence demonstrates sophisticated textile production, wool and plant fibres, coloured fabrics and functional clothing. Hallstatt/Dürrnberg provide unusually well-preserved evidence and are valuable analogues for textile technology, but they must not be used to claim that one precise garment cut was universal in Late La Tène Bohemia. Representations of trousers become more common in La Tène contexts, yet local social, chronological and regional variation remains substantial.

The current restrained knee-length tunic / belt / dark lower-body garment / soft-footwear silhouette is therefore acceptable as a low-detail readability hypothesis, not as a validated reconstruction.

**Art action:** production adult worker should remain unarmoured and non-elite, with restrained natural/dyed textile colours, practical footwear and no Roman military/fantasy shorthand. Before final acceptance, select a specific Late La Tène Central-European clothing reconstruction/reference set and document which garment features are direct evidence, analogy or art-direction inference.

## Deciduous forest candidate

**Status: SUPPORTED for broad deciduous character; REVISE / KEEP WIP for species mix and production vegetation.**

A Central-European broadleaf landscape is appropriate. EUNIS identifies Bohemian oak-hornbeam and oak-lime forests in plains and low hills of the Bohemian basin. Broader Czech vegetation syntheses also place oak/hornbeam, acidophilous oak and beech forests across different lowland and mid-altitude parts of Bohemia, with riverine woodland in wetter corridors. Long human exploitation also means that prehistoric settlement surroundings should not be rendered as untouched uniform climax forest.

The current 32-instance shared oak-like procedural candidate is useful for composition and scale, but one repeated mature tree form is insufficient for final "mixed deciduous forest" art direction.

**Art action:** preserve the settlement clearing and readable path/stream corridors. Production vegetation should introduce at least species/age/silhouette variation appropriate to the selected micro-region — e.g. oak plus hornbeam/beech and limited birch/younger edge growth where justified — instead of simply duplicating one crown. Final species proportions should be chosen against a more site-specific palaeoenvironmental reference if the benchmark is assigned a precise locality/altitude.

## Stream, path and terrain

**Status: SUPPORTED as settlement-environment language; visual polish still required.**

The evidence from sites such as Němčice and Staré Hradisko supports structured circulation/path space within major settlements; south/central Bohemian oppida such as Hrazany, Nevězice and Třísov also demonstrate occupation tied to the Vltava corridor and long-distance routes. This supports the benchmark's water/path/trade-landscape logic in broad terms.

It does not prove the current exact stream geometry. The existing stream banks and path edges should therefore be evaluated as environmental art, drainage and gameplay-readability problems rather than archaeological replicas.

**Art action:** soften repeated geometric bank/path edges, retain wet/dry material transitions, add controlled bank vegetation and worn work-area transitions, and keep the navigation corridor readable under canopy.

## Art-gate verdict for current benchmark

The benchmark now contains all required content classes and its **broad historical language is defensible**, but final historical/art acceptance is not yet justified.

Keep `artGatePassed=false` until at least:

1. the dwelling receives a reconstruction-specific architectural review and an optimization/LOD plan;
2. the storehouse and workshop remain explicitly WIP unless direct structural parallels are documented;
3. the low-poly inhabitant readability prototype is replaced/upgraded to the production character brief and reviewed against a documented clothing reference set;
4. the forest gains production species/age/silhouette variation and botanical review;
5. terrain/path/stream/lighting receive the planned visual polish;
6. actual-hardware 1080p performance is measured before final LOD thresholds are selected.

## Reference set used in this review

Primary Czech archaeological context:

- Archaeological Atlas of Bohemia — Stradonice u Nižboru, Late La Tène oppidum: https://www.archeologickyatlas.cz/en/lokace/stradonice_be_oppidum
- Archaeological Atlas of Bohemia — Hrazany: https://www.archeologickyatlas.cz/en/lokace/radic_pb_oppidum_hrazany
- Archaeological Atlas of Bohemia — Třísov: https://www.archeologickyatlas.cz/en/lokace/trisov_ck_oppidum
- Archaeological Atlas of Bohemia — Staré Hradisko: https://www.archeologickyatlas.cz/en/lokace/male_hradisko_pr_oppidum_stare_hradisko
- Čižmář & Čižmářová 2023, Němčice: research at a key La Tène site in Moravia, Antiquity 97(394): https://doi.org/10.15184/aqy.2023.80
- Čižmář & Danielisová 2021, Central Sites and the Development of Rural Settlements from the Middle to Late La Tène Period in Central Moravia, Památky archeologické 112: https://doi.org/10.35686/PA2021.4
- Danielisová 2020, Bohemia at the End of the La Tène Period, Památky archeologické 111: https://doi.org/10.35686/PA2020.3
- ARÚP online series, Archeologie pravěkých Čech — Doba laténská: https://www.arup.cas.cz/en/library/publikace-on-line/archeologie-pravekych-cech/

Textile/clothing context:

- Natural History Museum Vienna — Hallstatt textile research: https://nhm-wien.ac.at/hallstatt/en/textiles
- Natural History Museum Vienna — Dürrnberg, tools and clothing: https://www.nhm-wien.ac.at/hallstatt/en/trading_hub/centers_of_salt_production/duerrnberg
- Grömer, K. 2010, Prähistorische Textilkunst in Mitteleuropa (NHM Vienna publication; relevant comparative Central-European textile/clothing corpus).

Vegetation context:

- EUNIS T1E165 — Bohemian oak-hornbeam and oak-lime forests: https://eunis.eea.europa.eu/habitats/21631

## Interpretation rule

References from Austria or wider Central Europe are used as comparative analogues, not as proof that every detail occurred identically in Late La Tène Bohemia. Where the Czech/Moravian archaeological record supports only a building function, settlement organisation or production activity, the project must keep exact superstructure, clothing cut, species mix or workshop dressing visibly marked as reconstruction/art-direction inference until a closer source is documented.
