import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn("GROQ_API_KEY is not configured.");
}

const groq = apiKey
  ? new Groq({
      apiKey,
      timeout: 30000,
      maxRetries: 1,
    })
  : null;

const model = "openai/gpt-oss-20b";

export const generateGroqJSON = async (prompt) => {
  if (!groq) {
    throw new Error("Groq API key is not configured.");
  }

  const response = await groq.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a reliable assistant. Follow the user's instructions exactly. Return valid JSON when requested. Do not include Markdown fences around JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_completion_tokens: 1200,
    response_format: {
      type: "json_object",
    },
  });

  const content = response.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error("Groq returned an empty response.");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Groq returned invalid JSON.");
  }
};

export const getGroqModel = () => model;