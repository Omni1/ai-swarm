# ai-swarm
🐝 AI Swarm Gateway
A resilient, lightweight, OpenAI-compatible proxy gateway built with Node.js. It aggregates 6 free-tier AI providers into a single endpoint with automatic sequential failover (fallback), zero third-party framework overhead, and native UTF-8 support.

⚡ Features
OpenAI-Compatible API: Fully compatible with existing OpenAI clients, SDKs, web UIs (NextChat, Open WebUI, LibreChat), and automation bots.

Resilient Failover: If a primary provider hits rate limits or experiences downtime, requests automatically fall back to the next available provider.

Zero Heavy Dependencies: Built using native Node.js HTTP and Fetch APIs, requiring only dotenv for configuration.

Cross-Platform UTF-8: Correct character encoding preservation across Windows, Linux, and macOS environments.

🌐 Supported Providers & Models
Groq — qwen/qwen3.8-27b

Mistral AI — open-mistral-nemo

Cloudflare Workers AI — @cf/meta/llama-3.1-8b-instruct

OpenRouter — openrouter/auto

Cohere — command-r-08-2024

Google Gemini — gemini-3.6-flash

🚀 Quick Start
1. Clone the Repository
Bash
git clone https://github.com/Omni1/ai-swarm.git
cd ai-swarm
2. Install Dependencies
Bash
npm install
3. Configure Environment Variables
Copy the sample environment file:

Bash
# On Linux / macOS:
cp .env.example .env

# On Windows (cmd):
 .env.example .env
Open .env and provide your API keys:

Ini, TOML
GROQ_API_KEY=your_groq_api_key
MISTRAL_API_KEY=your_mistral_api_key
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
OPENROUTER_API_KEY=your_openrouter_api_key
COHERE_API_KEY=your_cohere_api_key
GEMINI_API_KEY=your_gemini_api_key
4. Run the Gateway
Bash
npm start
Or directly via Node.js:

Bash
node swarm.js
The server will initialize and listen on:

Plaintext
http://localhost:3000/v1/chat/completions
📡 Usage & Integration
With curl
Bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explain how a MOV varistor protects an electrical circuit."}
    ]
  }'
With Windows PowerShell
PowerShell
$response = Invoke-WebRequest -Uri "http://localhost:3000/v1/chat/completions" `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -UseBasicParsing `
  -Body '{"messages":[{"role":"user","content":"Hello Swarm!"}]}'

$json = [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) \vert{} ConvertFrom-Json$json.choices[0].message.content
With OpenAI SDK / Web Clients
Configure your favorite UI or application with the following parameters:

Base URL: http://localhost:3000/v1

API Key: sk-swarm (any arbitrary string)

Model: (automatically handled by the swarm failover)

🛡️ License
MIT License. Free for open-source development and personal use.
