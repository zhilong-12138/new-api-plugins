// Alibaba Cloud Model Studio (Bailian) Decision Model API (System One protocol):
// https://www.alibabacloud.com/help/en/model-studio/decision-model-api
// decision-model-preview supports a 65,536-token input context window; reserve
// 65,792 input tokens (64 KiB + 256-token system prefix headroom) at submission
// and settle on upstream usage.input_tokens upon synchronous completion.
const MAX_INPUT_TOKENS = 65792;
const MAX_SETTLE_INPUT_TOKENS = 262400;
const MODELS = ["decision-model-preview", "decision-model-preview-2026-09-24"];
const REQUEST_FIELDS = ["model", "state", "questions", "assets"];
const QUESTION_TYPES = ["choice", "score", "noul", "box"];

export const meta = {
  apiVersion: 1,
  key: "bailian-decision",
  name: { en: "Alibaba Bailian Decision", zh: "阿里百炼决策模型" },
  version: "1.0.0",
  icon: "Bailian.Color",
  author: { name: "zhilong-12138", url: "https://github.com/zhilong-12138" },
  website: "https://www.alibabacloud.com/help/en/model-studio/decision-model-api",
  description: {
    en: "Alibaba Bailian structured decision model via System One API",
    zh: "阿里百炼结构化决策模型，基于 System One 协议同步判断",
  },
  channelTypes: [17],
  auth: "api_key",
  // Literal model list also supports the dashboard's static script preview.
  models: ["decision-model-preview", "decision-model-preview-2026-09-24"],
  upstreams: ["vendor", "new_api"],
  // System One models read the serialized state object as written, so JSON key
  // order can affect decisions.
  requiredCapabilities: ["json-order@1"],
  fetchMode: "per_task",
  routes: [
    {
      method: "POST",
      path: "/compatible-mode/v1/systemone",
      type: "submit",
      decode: "decodeSystemOne",
      render: "renderSystemOne",
      retainResult: false,
    },
    {
      method: "POST",
      path: "/v1/systemone",
      type: "submit",
      decode: "decodeSystemOne",
      render: "renderSystemOne",
      retainResult: false,
    },
  ],
  usageSchema: {
    input_tokens: {
      type: "number",
      unit: "token",
      description: { en: "Input token unit price", zh: "输入 token 单价" },
    },
  },
  usageExamples: [{ label: "Decision", facts: { input_tokens: 1000 } }],
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isEntry(value) {
  return value === null || typeof value === "string" || typeof value === "object";
}

function validateRequest(body) {
  if (!isObject(body)) throw new Error("Request body must be a JSON object");
  for (const field of Object.keys(body)) {
    if (!REQUEST_FIELDS.includes(field)) throw new Error("Bailian Decision API does not accept the request field " + field);
  }
  if (typeof body.model !== "string" || !body.model.trim()) throw new Error("model is required");
  if (body.state === null || !isEntry(body.state)) throw new Error("state must be text, an object, or an array");
  if (!isObject(body.questions) || Object.keys(body.questions).length === 0) throw new Error("questions must be a nonempty object");

  for (const id of Object.keys(body.questions)) {
    const question = body.questions[id];
    if (!isObject(question) || !QUESTION_TYPES.includes(question.type)) {
      throw new Error("Each question must have type choice, score, noul, or box");
    }
    if (question.instructions !== undefined && !isEntry(question.instructions)) {
      throw new Error("Question instructions must be text, an object, an array, or null");
    }

    const criteria = question.criteria;
    if (question.type === "choice") {
      if (!isObject(criteria) || Object.keys(criteria).length === 0 || Object.keys(criteria).length > 255) {
        throw new Error("Choice criteria must contain between 1 and 255 options");
      }
      if (Object.values(criteria).some((value) => !isEntry(value))) {
        throw new Error("Choice option descriptions must be text, objects, arrays, or null");
      }
    } else if (question.type === "score") {
      if (!Array.isArray(criteria) || criteria.length < 1 || criteria.length > 10) {
        throw new Error("Score criteria must contain between 1 and 10 levels");
      }
      if (criteria.some((value) => value === null || !isEntry(value))) {
        throw new Error("Score levels must be text, objects, or arrays");
      }
    } else if (question.type === "noul" && criteria != null) {
      if (!isObject(criteria) || [criteria.true, criteria.false].some((value) => value !== undefined && !isEntry(value))) {
        throw new Error("Noul criteria must describe true and false with text, objects, arrays, or null");
      }
    }
  }
  return body;
}

function systemOneBody(body, model) {
  const request = { model: model, state: body.state, questions: body.questions };
  if (body.assets !== undefined) request.assets = body.assets;
  return request;
}

function systemOneRequest(ctx) {
  const body = validateRequest(ctx.requestBody);
  const model = ctx.upstreamModel || ctx.model;
  if (!MODELS.includes(model)) {
    throw new Error("Unsupported Bailian Decision model; use decision-model-preview or map an alias to it");
  }
  return systemOneBody(body, model);
}

function normalizeBaseUrl(rawBaseUrl) {
  let baseUrl = String(rawBaseUrl || "").replace(/\/+$/, "");
  if (baseUrl.endsWith("/compatible-mode/v1")) {
    baseUrl = baseUrl.slice(0, -"/compatible-mode/v1".length);
  } else if (baseUrl.endsWith("/compatible-mode")) {
    baseUrl = baseUrl.slice(0, -"/compatible-mode".length);
  } else if (baseUrl.endsWith("/v1")) {
    baseUrl = baseUrl.slice(0, -"/v1".length);
  }
  return baseUrl;
}

export function buildSubmitRequest(ctx) {
  const body = systemOneRequest(ctx);
  const baseUrl = normalizeBaseUrl(ctx.baseUrl);
  const isNewAPI = Boolean(ctx.upstream && ctx.upstream.kind === "new_api");
  const path = isNewAPI ? "/bailian-decision/compatible-mode/v1/systemone" : "/compatible-mode/v1/systemone";
  const headers = { Accept: "application/json" };
  const apiKey = String(ctx.apiKey || "").trim();
  if (apiKey) {
    headers.Authorization = apiKey.toLowerCase().startsWith("bearer ") ? apiKey : "Bearer " + apiKey;
  }
  const request = { url: baseUrl + path, method: "POST", headers: headers };

  const files = ctx.files || [];
  if (files.length === 0) {
    headers["Content-Type"] = "application/json";
    request.body = body;
    return request;
  }
  request.bodyType = "multipart";
  request.parts = [{ name: "request", value: JSON.stringify(body) }].concat(
    files.map((file) => ({ name: file.field, fileRef: file.ref, filename: file.filename }))
  );
  return request;
}

export function parseSubmitResponse(ctx, response) {
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error("Bailian Decision API returned HTTP " + response.statusCode);
  }
  const body = response.body;
  if (!isObject(body) || !isObject(body.answers)) {
    throw new Error("Bailian Decision API response is missing answers");
  }
  if (body.model !== undefined && (typeof body.model !== "string" || !body.model)) {
    throw new Error("Bailian Decision API response has an invalid model field");
  }
  for (const id of Object.keys(ctx.requestBody.questions)) {
    const answer = Object.prototype.hasOwnProperty.call(body.answers, id) ? body.answers[id] : null;
    if (!isObject(answer) || (answer.type !== undefined && answer.type !== ctx.requestBody.questions[id].type)) {
      throw new Error("Bailian Decision API response is missing a matching answer for question " + id);
    }
  }
  if (!ctx.publicTaskId) throw new Error("Missing gateway request ID");
  return {
    taskId: ctx.publicTaskId,
    taskData: body,
    immediate: { status: "SUCCESS", progress: "100%" },
  };
}

export function extractUsage(ctx) {
  systemOneRequest(ctx);
  if (ctx.usagePurpose === "billing_ratios") return null;
  return { input_tokens: MAX_INPUT_TOKENS };
}

export function extractUsageOnComplete(ctx, _result, body) {
  const usage = body && body.usage;
  const tokens = usage && (usage.input_tokens !== undefined ? usage.input_tokens : usage.prompt_tokens);
  // Throwing retains the reservation and logs a warning instead of coercing
  // missing or invalid upstream usage to zero.
  if (!Number.isInteger(tokens) || tokens < 0 || tokens > MAX_SETTLE_INPUT_TOKENS) {
    throw new Error("Bailian Decision input token usage is missing or outside the supported context budget");
  }
  return { input_tokens: tokens };
}

// API v1 requires polling hooks, but System One always completes synchronously.
export function buildQueryRequest() {
  throw new Error("Bailian Decision API has no task retrieval endpoint");
}

export function parseTaskResult() {
  return { status: "UNKNOWN", reason: "Bailian Decision API has no asynchronous tasks" };
}

export const native = {
  decodeSystemOne(ctx) {
    let value;
    if (ctx.body && ctx.body.kind === "json") {
      value = ctx.body.value;
    } else if (ctx.body && ctx.body.kind === "multipart") {
      const fields = ctx.body.fields.request;
      if (!fields || fields.length !== 1) {
        throw new Error("A multipart request needs one request field with the JSON request");
      }
      try {
        value = JSON.parse(fields[0]);
      } catch (e) {
        throw new Error("The request field must hold the JSON request", { cause: e });
      }
    } else {
      throw new Error("JSON or multipart body required");
    }
    const body = validateRequest(value);
    return {
      kind: "submit",
      model: body.model,
      action: "systemone",
      requestBody: systemOneBody(body, body.model),
    };
  },
  renderSystemOne(_ctx, task) {
    return task.data;
  },
  error(_ctx, error) {
    try {
      const body = JSON.parse(error.message);
      if (isObject(body) && (body.error !== undefined || body.detail !== undefined || (body.code !== undefined && body.message !== undefined))) {
        return body;
      }
    } catch (e) {
      // Gateway errors are plain sentences, not upstream JSON.
    }
    return { error: { message: error.message, type: "invalid_request_error", code: error.code || "plugin_error" } };
  },
};
