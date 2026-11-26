---
locale: en
translations:
  zh-CN: README.zh-CN.md
---
# Alibaba Bailian Decision

Structured decisions with Alibaba Cloud Model Studio (Bailian) decision models via the synchronous System One API.

## Channel setup

Create a dedicated channel using either the **Alibaba Bailian** (`#17`) channel type or the **Task Plugin** (`#61`) channel type bound to `bailian-decision`.

- **API Key**: Paste your DashScope / Model Studio API key (`sk-...`). The plugin sends it as `Authorization: Bearer {api_key}`. If an upstream endpoint requires a raw key without `Bearer `, set a Channel Request Header Override `Authorization: {api_key}`.
- **Base URL**: Set your Bailian workspace gateway address, such as `https://{workspace-id}.cn-beijing.maas.aliyuncs.com` or `https://{workspace-id}.ap-southeast-1.maas.aliyuncs.com`. The plugin automatically appends `/compatible-mode/v1/systemone` and normalizes trailing `/compatible-mode/v1`, `/compatible-mode`, or `/v1` suffixes.
- **Channel isolation**: Use a separate channel for decision models rather than changing the Base URL of an existing `dashscope.aliyuncs.com` channel, and remove `decision-model-preview` from any channel that points to `dashscope.aliyuncs.com`.

## Models and endpoints

| Endpoint | Models |
| --- | --- |
| `POST /compatible-mode/v1/systemone` | `decision-model-preview`, `decision-model-preview-2026-09-24` |
| `POST /v1/systemone` | `decision-model-preview`, `decision-model-preview-2026-09-24` |

The gateway also serves both paths under `/bailian-decision`. Sharing `POST /v1/systemone` with `typesafe` is supported: requests are routed by `model`.

## Billing

Each model defines an `input_tokens` unit price per million input tokens; structured decision outputs are not billed separately.

- Before calling upstream, the gateway reserves `65,792` input tokens (the 65,536-token context window plus prefix headroom).
- On synchronous completion, the gateway settles the actual `usage.input_tokens` reported by upstream and refunds the difference.
- If upstream omits `usage.input_tokens` or returns an out-of-range value, the plugin raises an error so the reservation is retained instead of coercing the charge to zero.

## Example

```bash
curl -sS -X POST https://gateway.example.com/v1/systemone \
  -H "Authorization: Bearer sk-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "decision-model-preview",
    "state": {
      "ticket_id": "T-1001",
      "content": "Payment succeeded over 24 hours ago, but the service is still unavailable."
    },
    "questions": {
      "department": {
        "type": "choice",
        "instructions": "Which team should handle this ticket?",
        "criteria": {
          "billing": "Payments, refunds, and invoices",
          "technical": "Product outages and integration issues"
        }
      },
      "escalate": {
        "type": "noul",
        "instructions": "Should on-call staff be notified immediately?"
      },
      "severity": {
        "type": "score",
        "instructions": "How severe is this issue?",
        "criteria": [
          "Minor issue with no functional impact",
          "Partial impact with a workaround",
          "Core feature unavailable without a workaround",
          "Severe business or security impact"
        ]
      }
    }
  }'
```

## Limits

- Requests complete synchronously with `retainResult: false`: the response body is returned once and is not stored for later task polling.
- Requires host support for `json-order@1` so the JSON member order of `state` is preserved.
- Configure pricing for `decision-model-preview` in the admin pricing settings before enabling it for users.
