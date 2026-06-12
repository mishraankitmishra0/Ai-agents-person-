const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    const { messages, systemPrompt, mode } = req.body;

    if (!messages || !Array.isArray(messages) || !systemPrompt || !mode) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    const validModes = ["analyze", "dashboard", "ppt", "risk", "database"];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ message: "Invalid mode" });
    }

    if (messages.length === 0) {
      return res.status(400).json({ message: "Messages cannot be empty" });
    }

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const content =
      response.content && response.content.length > 0
        ? response.content[0].type === "text"
          ? response.content[0].text
          : ""
        : "";

    if (!content) {
      return res.status(500).json({ message: "Empty response from Claude API" });
    }

    return res.status(200).json({ content });
  } catch (error) {
    console.error("API Error:", error);

    if (error.status === 401) {
      return res.status(401).json({ message: "Unauthorized: Invalid API key" });
    }

    if (error.status === 429) {
      return res.status(429).json({ message: "Rate limited: Too many requests" });
    }

    if (error.status === 500) {
      return res.status(500).json({ message: "Claude API is unavailable" });
    }

    return res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
