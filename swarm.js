import 'dotenv/config';
import http from 'http';

// Swarm provider pool (6 independent endpoints)
const providers = [
  {
    name: 'groq',
    apiKey: process.env.GROQ_API_KEY,
    model: 'qwen/qwen3.8-27b',
    async call(prompt, maxTokens = 350) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`[Groq ${res.status}]: ${await res.text()}`);
      const data = await res.json();
      return data.choices[0].message.content.trim();
    }
  },
  {
    name: 'mistral',
    apiKey: process.env.MISTRAL_API_KEY,
    model: 'open-mistral-nemo',
    async call(prompt, maxTokens = 350) {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`[Mistral ${res.status}]: ${await res.text()}`);
      const data = await res.json();
      return data.choices[0].message.content.trim();
    }
  },
  {
    name: 'cloudflare',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    model: '@cf/meta/llama-3.1-8b-instruct',
    async call(prompt, maxTokens = 350) {
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.3
        })
      });
      if (!res.ok) throw new Error(`[Cloudflare ${res.status}]: ${await res.text()}`);
      const data = await res.json();
      return (data.result?.response || JSON.stringify(data.result)).trim();
    }
  },
  {
    name: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'openrouter/auto',
    async call(prompt, maxTokens = 350) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Local-Swarm",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`[OpenRouter ${res.status}]: ${await res.text()}`);
      const data = await res.json();
      return data.choices[0].message.content.trim();
    }
  },
  {
    name: 'cohere',
    apiKey: process.env.COHERE_API_KEY,
    model: 'command-r-08-2024',
    async call(prompt) {
      const res = await fetch("https://api.cohere.com/v2/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: { type: "text", text: prompt } }]
        })
      });
      if (!res.ok) throw new Error(`[Cohere ${res.status}]: ${await res.text()}`);
      const data = await res.json();
      return data.message.content[0].text.trim();
    }
  },
  {
    name: 'gemini',
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-3.6-flash',
    async call(prompt, maxTokens = 400) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens }
        })
      });
      if (!res.ok) throw new Error(`[Gemini ${res.status}]: ${await res.text()}`);
      const data = await res.json();
      return data.candidates[0].content.parts[0].text.trim();
    }
  }
];

// Sequential resilient failover dispatcher
async function askSwarm(prompt) {
  let errors = [];
  for (const p of providers) {
    const start = Date.now();
    try {
      const answer = await p.call(prompt);
      const took = ((Date.now() - start) / 1000).toFixed(2);
      return { ok: true, provider: p.name, model: p.model, took, answer };
    } catch (err) {
      errors.push(`[${p.name}]: ${err.message}`);
      console.warn(`[WARN] Provider ${p.name.toUpperCase()} failed, switching to next candidate...`);
    }
  }
  return { ok: false, errors };
}

// Bootstrap health check and local HTTP server
async function bootstrap() {
  console.log("AI SWARM GATEWAY: Initializing core...\n");

  const PORT = 3000;
  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/v1/chat/completions" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const parsed = JSON.parse(body || "{}");
          const userMsg = parsed.messages?.slice().reverse().find(m => m.role === "user")?.content || "Hello";

          console.log(`[REQ] Incoming request: "${userMsg.slice(0, 60)}..."`);
          const response = await askSwarm(userMsg);

          if (response.ok) {
            console.log(`[OK] Handled via [${response.provider.toUpperCase()}] in ${response.took}s`);
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: response.model,
              choices: [{
                index: 0,
                message: { role: "assistant", content: response.answer },
                finish_reason: "stop"
              }],
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            }));
          } else {
            res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ 
              error: "All providers failed or rate-limited", 
              details: response.errors 
            }));
          }
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ 
        status: "Swarm Gateway Online", 
        activeProviders: providers.map(p => p.name) 
      }));
    }
  });

  server.listen(PORT, () => {
    console.log(`Gateway listening at http://localhost:${PORT}/v1/chat/completions`);
    console.log(`Active provider pool: ${providers.map(p => p.name).join(', ')}`);
  });
}

bootstrap();
