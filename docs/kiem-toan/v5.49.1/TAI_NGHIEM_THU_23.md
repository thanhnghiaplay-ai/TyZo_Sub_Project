# Tái nghiệm thu 23 mục FIXED_CODE

Test fixture không chứng nhận production. R3-007 chỉ kiểm đăng ký middleware/adapter, còn thiếu transport E2E riêng.

| ID | Test/bằng chứng | Kết quả fixture |
|---|---|---|
| AZ-005 | `src/lib/app-api.test.ts` — Stream cap, cancel before full body | PASS |
| AZ-007 | `src/lib/backend-audit.test.ts` — SQL rollback when device insert fails | PASS |
| AZ-009 | `src/lib/app-api.test.ts` — coded500 generic response and redacted log | PASS |
| DEEP-008 | `src/lib/live/live-bridge-audit.test.ts` — real local WebSocket bufferedAmount backpressure | PASS |
| DEEP-010 | `src/lib/backend-audit.test.ts` — actual webhook handlers auth-before-read and body cap | PASS |
| R3-004 | `src/lib/backend-audit.test.ts` — password/device trigger atomic rollback + expired pending link | PASS |
| R3-005 | `src/lib/backend-audit.test.ts` — 12 concurrent link-code requests serialize | PASS |
| R3-007 | `src/lib/backend-audit.test.ts` — three endpoints register auth middleware; transport fixture | PARTIAL |
| R4-004 | `src/lib/backend-audit.test.ts` — device invalid after user removal | PASS |
| R4-005 | `src/lib/backend-audit.test.ts` — fault inside removal rolls all changes back | PASS |
| R4-006 | `src/lib/backend-audit.test.ts` — revenue aggregate >=3.2 billion | PASS |
| R4-007 | `src/lib/backend-audit.test.ts` — actual history DELETE per-account rate call | PASS |
| R4-008 | `src/lib/backend-audit.test.ts` — temp password invalidates web and Android sessions | PASS |
| R5-007 | `src/lib/backend-audit.test.ts` — conflicting affiliate reports false and preserves original | PASS |
| R5-009 | `browser-checks.json` — native IndexedDB abort after request success persists nothing | PASS |
| R6-001 | `src/lib/pipeline/job-race.test.ts` — late decoded A cannot replace B | PASS |
| R6-002 | `src/lib/sub/media-lifecycle.test.ts` — metadata timeout + abort before/during wait | PASS |
| R6-003 | `src/lib/sub/mp4-range.test.ts` — invalid sample count rejected | PASS |
| R6-004 | `src/lib/sub/mp4-range.test.ts` — Content-Range + length + streamed byte cap | PASS |
| R6-005 | `src/lib/sub/media-lifecycle.test.ts` — XHR stall yields retryable failure; user abort distinct | PASS |
| R6-008 | `src/lib/pipeline/recognize-race.test.ts` — new run after trial await retains its cost/events | PASS |
| R6-009 | `src/lib/sub/media-lifecycle.test.ts` — FileReader aborted before provider request | PASS |
| R8-002 | `scripts/migration-read-permission.test.mjs` — EACCES migrations fails before DB connect | PASS |
