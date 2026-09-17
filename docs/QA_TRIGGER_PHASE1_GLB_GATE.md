# Phase 1 GLB admission hardening validation trigger

Validation-only marker for the authoritative Phase 1 base at `c80262fcf0e995120024f25b2b08a717222fecc7`.

The base adds mandatory NORMAL/TEXCOORD_0 admission checks for canonical generated Phase 1 assets, fixes embedded `bufferView: 0` image validation and syntax-checks the intake scripts even when all generated candidates are still pending.

Do not merge this marker into the authoritative branch.
