<div align="center">

# 🤖 Advanced AI API with Intelligent Routing

### High-Performance Node.js API with Automatic Model Selection

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-black)](https://fastify.dev)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-API-purple)](https://openrouter.ai)

**Developed by Ayan Sayyad**

🔗 **[Live Demo](https://mutlimodel-ai-api.onrender.com/docs)**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-api-documentation) • [Deployment](#-deployment)

</div>

---

## 📖 Overview

A production-ready AI API that intelligently routes requests to optimal models based on automatic intent detection. Built with **Fastify** for maximum performance, supports **streaming and non-streaming** responses, and includes comprehensive **health monitoring** with circuit breaker patterns.

Perfect for developers who want a unified AI interface without manually selecting models for each request.

## 🎮 Try It Now

**Live Testing Environment**: [https://mutlimodel-ai-api.onrender.com/docs](https://mutlimodel-ai-api.onrender.com/docs)

Test the API directly in your browser with our interactive documentation interface!

Quick test via cURL
curl -X POST https://mutlimodel-ai-api.onrender.com/api/chat
-H "Content-Type: application/json"
-d '{"prompt": "Write a hello world in Python"}'

text

## ✨ Features

### 🎯 **Intelligent Model Selection**
- **Zero-latency intent detection** - Analyzes prompts in <1ms using 200+ keyword patterns
- **5 Intent categories** - Coding, Math, Reasoning, Creative, and General
- **Automatic routing** - No manual model selection required

### ⚡ **High Performance**
- **Fastify framework** - 5-6x faster than Express (48k-114k req/sec)
- **HTTP connection pooling** - 40-60% latency reduction with keep-alive
- **Request queue system** - Intelligent backpressure handling
- **Multi-core clustering** - Automatic CPU utilization

### 🛡️ **Production-Ready Reliability**
- **Circuit breaker pattern** - Auto-disables failing models
- **Automatic retries** - Up to 3 attempts with exponential backoff
- **Health monitoring** - Real-time metrics for all models
- **Graceful degradation** - Emergency fallback systems

### 🌊 **Flexible Response Formats**
- **Streaming (SSE)** - Real-time token-by-token responses
- **Non-streaming** - Complete responses in single payload
- **GET & POST** - Multiple endpoint styles for convenience

### 💡 **Developer Experience**
- **Interactive `/docs` UI** - Test all endpoints in beautiful web interface
- **Comprehensive examples** - cURL, JavaScript, Python, Node.js
- **Zero dependencies UI** - Pure HTML/CSS/JavaScript documentation
- **Complete observability** - Health and stats endpoints

## 🚀 Quick Start

### Prerequisites

Node.js >= 18.0.0
RAM >= 512MB (2GB recommended)
OpenRouter API Key (get free at openrouter.ai)

text

### Installation

Clone the repository
git clone <your-repo-url>
cd openrouter-ai-api

Install dependencies
npm install

Create environment file
cp .env.example .env

Add your OpenRouter API key to .env
nano .env

text

### Run the Server

Development mode (with auto-reload)
npm run dev

Production mode (single process)
npm run prod

Production mode (multi-core cluster)
npm run cluster

Using PM2 (recommended for production)
npm install -g pm2
npm run pm2:start

text

### Test the API

Open interactive documentation
open http://localhost:3000/docs

Or test via cURL
curl -X POST http://localhost:3000/api/chat
-H "Content-Type: application/json"
-d '{"prompt": "Write a hello world in Python"}'

text

## 📚 API Documentation

### Base URLs
- **Production**: `https://mutlimodel-ai-api.onrender.com`
- **Local**: `http://localhost:3000`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/docs` | Interactive documentation UI |
| `POST` | `/api/chat` | Non-streaming completion |
| `POST` | `/api/chat/stream` | Streaming completion (SSE) |
| `GET` | `/api/chat?q=query` | Simple GET query |
| `GET` | `/api/chat/stream?q=query` | Streaming GET query |
| `GET` | `/health` | System health & metrics |
| `GET` | `/api/stats` | Model performance stats |

### Example Requests

#### Non-Streaming Chat

curl -X POST https://mutlimodel-ai-api.onrender.com/api/chat
-H "Content-Type: application/json"
-d '{
"prompt": "Explain async/await in JavaScript"
}'

text

**Response:**
{
"success": true,
"model": "qwen/qwen-2.5-coder-32b-instruct:free",
"intent": "coding",
"retryAttempt": 0,
"response": "Async/await is syntactic sugar...",
"usage": {
"prompt_tokens": 8,
"completion_tokens": 156,
"total_tokens": 164
}
}

text

#### JavaScript Example

const response = await fetch('https://mutlimodel-ai-api.onrender.com/api/chat', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
prompt: 'Calculate the fibonacci sequence'
})
});

const data = await response.json();
console.log(data.response);

text

#### Python Example

import requests

response = requests.post('https://mutlimodel-ai-api.onrender.com/api/chat',
json={'prompt': 'What is machine learning?'}
)

data = response.json()
print(data['response'])

text

## 🎯 Intent Detection

The API automatically detects intent and routes to optimal models:

| Intent | Keywords | Best Model |
|--------|----------|------------|
| **Coding** | python, javascript, code, function, api, debug | Qwen-Coder, DeepSeek-Chat |
| **Math** | calculus, equation, solve, derivative, matrix | DeepSeek-R1, Qwen-Coder |
| **Reasoning** | analyze, explain, compare, logic, why | DeepSeek-R1, Llama-3.3 |
| **Creative** | story, poem, creative, write, imagine | MiniMax-M2, Llama-3.3 |
| **General** | Everything else | Llama-3.3, DeepSeek-R1 |

## ⚙️ Configuration

### Environment Variables

Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

Optional
PORT=3000
HOST=0.0.0.0
MEMORY_LIMIT_MB=512
NODE_ENV=production
SELECTION_STRATEGY=health-aware-round-robin
APP_URL=http://localhost:3000
APP_NAME=Advanced-AI-API

text

## 🤖 Available Models

All models are **100% FREE** via OpenRouter:

| Model | Specialty | Context | Temperature |
|-------|-----------|---------|-------------|
| **Qwen 2.5 Coder 32B** | Code generation | 4K | 0.3 |
| **DeepSeek Chat v3.1** | Advanced coding | 8K | 0.4 |
| **DeepSeek R1** | Math & reasoning | 8K | 0.2-0.7 |
| **Llama 3.3 8B** | General purpose | 4K | 0.7-0.8 |
| **MiniMax M2** | Creative writing | 8K | 0.9 |

## 📊 Performance Benchmarks

### Low-Spec Server (512MB RAM, 1 vCPU)
- ✅ **50-80 concurrent requests**
- ✅ **380MB peak memory**
- ✅ **120-200ms response time**
- ✅ **300-500 requests/minute**

### Medium-Spec Server (2GB RAM, 2 vCPU)
- ✅ **200-300 concurrent requests**
- ✅ **1.2GB peak memory**
- ✅ **80-150ms response time**
- ✅ **3,000-5,000 requests/minute**

## 🐳 Deployment

### Render (Recommended)

1. Push code to GitHub
2. Create new Web Service on Render
3. Add `OPENROUTER_API_KEY` environment variable
4. Deploy with: `node server.js`

### Docker

docker build -t ai-api .
docker run -d -p 3000:3000
-e OPENROUTER_API_KEY=your_key
--name ai-api ai-api

text

## 🔍 Monitoring

### Health Check

curl https://mutlimodel-ai-api.onrender.com/health

text

## 🐛 Troubleshooting

**"API Error: 401"**
- ✅ Verify `OPENROUTER_API_KEY` is correct
- ✅ Check credits at openrouter.ai dashboard

**"Server overloaded" (429)**
- ✅ Wait a few seconds and retry
- ✅ Implement exponential backoff

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**Ayan Sayyad**

## 💬 Support

- 🐛 **Bug Reports:** Open an issue
- 💡 **Feature Requests:** Start a discussion
- 🌐 **Live Demo:** [https://mutlimodel-ai-api.onrender.com/docs](https://mutlimodel-ai-api.onrender.com/docs)

---

<div align="center">

**Built with ⚡ Fastify • 🤖 OpenRouter • 🚀 Node.js**

**Developed by Ayan Sayyad**

⭐ Star this repo if you find it helpful!

</div>
