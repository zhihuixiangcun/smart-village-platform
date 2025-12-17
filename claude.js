#!/usr/bin/env node
const { Anthropic } = require("@anthropic-ai/sdk");

const client = new Anthropic({ 
  apiKey: "YOUR_API_KEY",
  baseURL: " https://api.anthropic.com "  // 使用官方 API
});

async function main() {
  console.log("Claude > 你好！请告诉我你的需求\n");

  const question = "作为AI助手你能做什么？";
  const response = await client.messages.create({
    model: "claude-3-sonnet-20240514",
    max_tokens: 1024,
    messages: [{ role: "user", content: question }],
  });

  response.content.forEach(item => {
    if(item.type === "text") console.log(item.text);
  });
}

main();
