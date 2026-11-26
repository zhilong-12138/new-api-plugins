---
locale: zh-CN
---
# 阿里百炼决策模型

通过阿里云百炼（Model Studio）的同步 System One 协议调用结构化决策模型，支持单次请求并行输出分类、是非与评分结果。

## 渠道设置

建议新建一个独立渠道，渠道类型可选 **阿里百炼（`#17`）** 或 **任务插件（`#61`，绑定 `bailian-decision`）**：

- **密钥**：填写阿里云百炼 / DashScope API Key（`sk-...`）。插件默认按 `Authorization: Bearer {api_key}` 发送鉴权头；若特定接入点要求不带 `Bearer ` 前缀，可在渠道「请求头覆盖」中配置 `Authorization: {api_key}`。
- **API 地址**：填写百炼工作空间网关根地址，例如 `https://{workspace-id}.cn-beijing.maas.aliyuncs.com` 或 `https://{workspace-id}.ap-southeast-1.maas.aliyuncs.com`。插件会自动拼接 `/compatible-mode/v1/systemone`，并自动清理末尾多余的 `/compatible-mode/v1`、`/compatible-mode` 或 `/v1`。
- **渠道隔离**：请为决策模型单独建渠道，不要直接修改已有 `dashscope.aliyuncs.com` 渠道的 API 地址，同时不要在指向 `dashscope.aliyuncs.com` 的渠道中勾选 `decision-model-preview`。

## 模型与接口

| 接口 | 模型 |
| --- | --- |
| `POST /compatible-mode/v1/systemone` | `decision-model-preview`、`decision-model-preview-2026-09-24` |
| `POST /v1/systemone` | `decision-model-preview`、`decision-model-preview-2026-09-24` |

网关同时会在 `/bailian-decision` 前缀下提供以上两条路径。与 `typesafe` 插件共享 `POST /v1/systemone` 时，网关会按请求中的 `model` 自动分流。

## 计费

每个模型配置 `input_tokens` 输入 token 单价（按每百万输入 token 计价），结构化决策输出不单独计费。

- 请求发出前，网关按 `65,792` 输入 token 预扣额度（覆盖 65,536 上下文窗口与系统前缀余量）。
- 上游同步返回后，网关读取响应中的 `usage.input_tokens` 按实际用量完成结算并退还差额。
- 若上游响应缺少 `usage.input_tokens` 或数值超出允许范围，插件会抛出异常以保留预扣额度，不会将其置零。

## 示例

```bash
curl -sS -X POST https://gateway.example.com/v1/systemone \
  -H "Authorization: Bearer sk-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "decision-model-preview",
    "state": {
      "ticket_id": "T-1001",
      "content": "订单支付后超过 24 小时仍未到账，用户无法继续使用核心服务，要求立即处理。"
    },
    "questions": {
      "department": {
        "type": "choice",
        "instructions": "应该由哪个团队处理？",
        "criteria": {
          "billing": "支付、退款和账单问题",
          "technical": "产品故障和集成问题"
        }
      },
      "escalate": {
        "type": "noul",
        "instructions": "是否需要立即通知值班人员？"
      },
      "severity": {
        "type": "score",
        "instructions": "这个问题有多严重？",
        "criteria": [
          "轻微问题，不影响功能",
          "部分功能受影响，但存在替代方案",
          "核心功能不可用，没有替代方案",
          "造成严重业务或安全影响"
        ]
      }
    }
  }'
```

## 使用限制

- 接口为同步直出且声明 `retainResult: false`，上游响应仅本次返回，不持久化结果快照，不支持异步轮询查询。
- 依赖宿主支持 `json-order@1` 能力，以确保 `state` 对象的 JSON 键顺序原样发送给上游。
- 对用户开放前，请先在后台模型定价中为 `decision-model-preview` 设置价格。
