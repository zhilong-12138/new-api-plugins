---
changelogVersion: 1
plugin: "bailian-decision"
version: "1.0.0"
locale: "zh-CN"
---
# Changelog

## [1.0.0]

### Added

- 新增阿里云百炼决策模型 `decision-model-preview` 与 `decision-model-preview-2026-09-24` 的同步 System One 调用支持，提供 `POST /compatible-mode/v1/systemone` 与 `POST /v1/systemone` 接口。
- 支持阿里百炼（`#17`）、任务插件（`#61`）与 New API（`#60`）上游渠道，自动规范化 `/compatible-mode/v1/systemone` 路径并启用 `json-order@1` 保持 JSON 字段顺序。
- 提交前按 `65,792` 输入 token 预扣，同步完成后按上游 `usage.input_tokens` 结算，并通过 `retainResult: false` 避免持久化大响应快照。

### Migration

- 对用户开放前，请先为 `decision-model-preview`（以及按需为 `decision-model-preview-2026-09-24`）设置价格。
