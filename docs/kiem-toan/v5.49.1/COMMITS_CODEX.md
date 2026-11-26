# Commit cục bộ phiên Codex

Không push, không merge main. Commit tích hợp pipeline gồm các hunk dùng chung use-pipeline.ts; test đăng ký cùng commit hồ sơ/ứng viên cuối.

| Commit | Phạm vi |
|---|---|
| `595dc1571072ae684bd76603f7ee871beaf36548` | fix(ip): select validated client IP from configured trusted ingress |
| `fa1c3efeb81b06d974c5738b38fbcb481875d8cb` | fix(billing): reconcile ASR responses without duration |
| `2bb86462175b58382a1d00c7f36256fa481c7139` | fix(upload): clean R2 grants after failed or aborted PUT |
| `76c07802e4ba6e6ed0b3bee1ae91432390e11fdf` | fix(polish): preserve numbers negations and names conservatively |
| `e3cf384635da9a7b4e438bfa5b808e49e9d81f67` | fix(glossary): bound retries and warn once per run |
| `90c8ccc124a8971674c414ec840f685be2e0a6d0` | fix(narration): settle cancelled audio and abort stale synthesis |
| `5c31fee9562bf50c01e9b1b22edfd2fb07d3cd8e` | ci(android): isolate release permissions and pin actions |
| `7b27f6558d3cd0ce674e3af5d1e57190006b5ef9` | fix(pipeline): isolate account saves and guard active or stale work |
| `8b61a1afa7945fd122d30464f7b978acdb0deb45` | fix(mp4): bound streamed ranges and validate content positions |
| `afa54cea37a555a475a4dc77e5539683b80071c7` | fix(api): redact coded server failures from public responses |
| `e495bb57ed5caa868429603443d4ede36bea2328` | fix(auth): revoke devices atomically on credential password updates |
| `e9151ebf219437d9f7f6848bc5db7160e86c782c` | test(live): verify upstream backpressure with local WebSockets |
| `b5c73c7bb0f3129d79f418143c7f638921d4b334` | test(migrations): fail closed on unreadable migration directories |

Rollback: xem BAO_CAO.md; lưu diff người dùng trước, dùng revert commit đã chọn. Không tự drop trigger0046 hoặc xóa ledger.
