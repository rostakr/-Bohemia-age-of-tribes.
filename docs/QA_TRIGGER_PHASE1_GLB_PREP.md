# Phase 1 GLB preparation pipeline validation trigger

Validation-only marker for authoritative Phase 1 head `cafda8cc11711a047ab60b875a02578f3bae0bc0`.

The base adds `add-glb-normals.mjs` plus a synthetic end-to-end self-test: raw UV-mapped GLB without NORMAL must fail strict admission, normal preparation must add valid vertex normals, and the prepared file must then pass strict NORMAL/UV0 admission.

Do not merge this marker into the authoritative branch.
