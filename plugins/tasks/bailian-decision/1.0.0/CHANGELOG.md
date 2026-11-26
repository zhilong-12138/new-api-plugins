---
changelogVersion: 1
plugin: "bailian-decision"
version: "1.0.0"
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.0.0]

### Added

- Add synchronous System One decision support for `decision-model-preview` and `decision-model-preview-2026-09-24` on `POST /compatible-mode/v1/systemone` and `POST /v1/systemone`.
- Support Alibaba Bailian (`#17`), Task Plugin (`#61`), and New API (`#60`) upstream channels with automatic `/compatible-mode/v1/systemone` URL normalization and `json-order@1` member-order preservation.
- Reserve `65,792` input tokens before submission and settle charges from upstream `usage.input_tokens` with `retainResult: false`.

### Migration

- Set a price for `decision-model-preview` (and `decision-model-preview-2026-09-24` if used) before enabling the plugin for users.
