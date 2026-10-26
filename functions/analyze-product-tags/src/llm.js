/**
 * 大模型调用封装（DeepSeek OpenAI 兼容接口）。
 * 密钥 DEEPSEEK_API_KEY 由 QMuse 密钥管理注入云函数，浏览器不持有。
 * 模型 id 通过环境变量 LLM_MODEL 配置；未配置时回退到 deepseek-flash。
 */

export const LLM_BASE_URL = "https://api.deepseek.com";
export const LLM_MODEL = process.env.LLM_MODEL || "deepseek-flash";

/** 统一 ChatCompletions 调用，要求 JSON 输出，自动剥离代码围栏后解析 */
export async function chatJson({ system, user }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const resp = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`LLM ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return JSON.parse(content.replace(/^```json|```$/g, "").trim());
}
