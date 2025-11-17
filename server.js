const Fastify = require('fastify');
const http = require('http');
const https = require('https');
const cluster = require('cluster');
const os = require('os');
const fetch = require('node-fetch');

// ============= CONFIGURATION =============
const CONFIG = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  OPENROUTER_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
  APP_URL: process.env.APP_URL || 'https://mutlimodel-ai-api.onrender.com',
  APP_NAME: process.env.APP_NAME || 'Advanced-AI-API',
  MEMORY_MB: parseInt(process.env.MEMORY_LIMIT_MB || 512),
  SELECTION_STRATEGY: process.env.SELECTION_STRATEGY || 'health-aware-round-robin',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

// ============= KEYWORD SYSTEM =============
const INTENT_KEYWORDS = {
  coding: {
    high: new Set([
      'python', 'javascript', 'typescript', 'java', 'c++', 'cpp', 'csharp', 'c#',
      'rust', 'go', 'golang', 'php', 'ruby', 'swift', 'kotlin', 'scala',
      'perl', 'bash', 'shell', 'powershell', 'lua', 'dart', 'elixir', 'haskell',
      'clojure', 'assembly', 'fortran', 'cobol', 'lisp', 'prolog', 'erlang',
      'objective-c', 'r', 'matlab', 'julia', 'groovy', 'pascal', 'vb.net'
    ]),
    medium: new Set([
      'code', 'function', 'method', 'class', 'object', 'variable', 'array',
      'loop', 'iteration', 'recursion', 'algorithm', 'datastructure', 'stack',
      'queue', 'linkedlist', 'tree', 'graph', 'hash', 'sorting', 'searching',
      'api', 'rest', 'graphql', 'endpoint', 'middleware', 'framework', 'library',
      'package', 'module', 'import', 'export', 'namespace', 'interface',
      'inheritance', 'polymorphism', 'encapsulation', 'abstraction', 'oop',
      'async', 'await', 'promise', 'callback', 'thread', 'process', 'concurrency',
      'parallelism', 'mutex', 'semaphore', 'deadlock', 'raceCondition',
      'compile', 'runtime', 'interpreter', 'compiler', 'bytecode', 'jit',
      'garbage', 'memory', 'pointer', 'reference', 'malloc', 'free',
      'try', 'catch', 'throw', 'exception', 'error', 'bug', 'debug', 'breakpoint',
      'refactor', 'optimize', 'performance', 'benchmark', 'profiling'
    ]),
    tools: new Set([
      'git', 'github', 'gitlab', 'docker', 'kubernetes', 'jenkins', 'ci/cd',
      'npm', 'yarn', 'pip', 'maven', 'gradle', 'webpack', 'babel', 'eslint',
      'vscode', 'intellij', 'eclipse', 'vim', 'emacs', 'ide', 'editor',
      'react', 'angular', 'vue', 'nextjs', 'nuxt', 'svelte', 'jquery',
      'nodejs', 'node.js', 'express', 'fastify', 'nestjs', 'django', 'flask',
      'spring', 'laravel', 'rails', '.net', 'asp.net', 'blazor',
      'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'cassandra',
      'sql', 'nosql', 'orm', 'prisma', 'sequelize', 'mongoose', 'typeorm',
      'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify', 'cloudflare'
    ]),
    low: new Set([
      'syntax', 'semicolon', 'bracket', 'parenthesis', 'indentation', 'comment',
      'string', 'integer', 'float', 'boolean', 'null', 'undefined', 'nan',
      'const', 'let', 'var', 'static', 'final', 'public', 'private', 'protected',
      'if', 'else', 'switch', 'case', 'for', 'while', 'do', 'break', 'continue',
      'return', 'yield', 'lambda', 'arrow', 'ternary', 'operator', 'expression',
      'statement', 'block', 'scope', 'closure', 'hoisting', 'prototype',
      'json', 'xml', 'yaml', 'toml', 'csv', 'regex', 'pattern', 'match'
    ])
  },
  math: {
    high: new Set([
      'calculus', 'algebra', 'geometry', 'trigonometry', 'statistics', 'probability',
      'differential', 'integral', 'derivative', 'limit', 'theorem', 'proof',
      'matrix', 'vector', 'tensor', 'eigenvalue', 'determinant', 'polynomial',
      'logarithm', 'exponential', 'factorial', 'permutation', 'combination'
    ]),
    medium: new Set([
      'equation', 'formula', 'calculate', 'compute', 'solve', 'simplify',
      'evaluate', 'integrate', 'differentiate', 'optimize', 'maximize', 'minimize',
      'sum', 'product', 'quotient', 'remainder', 'modulo', 'absolute',
      'square', 'cube', 'root', 'power', 'exponent', 'base'
    ]),
    low: new Set([
      'math', 'number', 'digit', 'integer', 'decimal', 'fraction', 'ratio',
      'add', 'subtract', 'multiply', 'divide', 'plus', 'minus', 'times'
    ])
  },
  creative: {
    high: new Set([
      'story', 'poem', 'lyrics', 'screenplay', 'dialogue', 'narrative',
      'character', 'plot', 'setting', 'chapter', 'verse', 'stanza',
      'fiction', 'fantasy', 'scifi', 'romance', 'thriller', 'mystery'
    ]),
    medium: new Set([
      'write', 'create', 'compose', 'draft', 'brainstorm', 'imagine',
      'describe', 'illustrate', 'portray', 'depict', 'creative', 'artistic'
    ]),
    low: new Set([
      'idea', 'concept', 'theme', 'style', 'tone', 'mood', 'voice'
    ])
  },
  reasoning: {
    high: new Set([
      'analyze', 'evaluate', 'compare', 'contrast', 'critique', 'assess',
      'reasoning', 'logic', 'argument', 'premise', 'conclusion', 'inference',
      'deduction', 'induction', 'hypothesis', 'evidence', 'proof'
    ]),
    medium: new Set([
      'explain', 'why', 'how', 'what', 'when', 'where', 'who', 'which',
      'because', 'therefore', 'thus', 'hence', 'consequently', 'implies'
    ]),
    low: new Set([
      'think', 'consider', 'reason', 'understand', 'comprehend', 'grasp'
    ])
  }
};

function detectIntent(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const words = lowerPrompt.split(/[\s.,;:!?()[\]{}'"]+/).filter(w => w.length > 0);
  
  const scores = { coding: 0, math: 0, creative: 0, reasoning: 0, general: 0 };
  const weights = { high: 3, medium: 2, tools: 2, low: 1 };

  for (const word of words) {
    for (const [intent, categories] of Object.entries(INTENT_KEYWORDS)) {
      for (const [level, keywords] of Object.entries(categories)) {
        if (keywords.has(word)) {
          scores[intent] += weights[level];
        }
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'general';

  return Object.keys(scores).find(key => scores[key] === maxScore);
}

// ============= MODEL CONFIGURATION =============
const MODEL_POOL = {
  coding: [
    { id: 'qwen/qwen-2.5-coder-32b-instruct:free', priority: 1, maxTokens: 4096, temperature: 0.3 },
    { id: 'deepseek/deepseek-chat-v3.1:free', priority: 2, maxTokens: 8192, temperature: 0.4 }
  ],
  math: [
    { id: 'deepseek/deepseek-r1-0528:free', priority: 1, maxTokens: 8192, temperature: 0.2 },
    { id: 'qwen/qwen-2.5-coder-32b-instruct:free', priority: 2, maxTokens: 4096, temperature: 0.3 }
  ],
  reasoning: [
    { id: 'deepseek/deepseek-r1-0528:free', priority: 1, maxTokens: 8192, temperature: 0.7 },
    { id: 'z-ai/glm-4.5-air:free', priority: 2, maxTokens: 4096, temperature: 0.7 }
  ],
  creative: [
    { id: 'minimax/minimax-m2:free', priority: 1, maxTokens: 8192, temperature: 0.9 },
    { id: 'z-ai/glm-4.5-air:free', priority: 2, maxTokens: 4096, temperature: 0.8 }
  ],
  general: [
    { id: 'z-ai/glm-4.5-air:free', priority: 1, maxTokens: 4096, temperature: 0.7 },
    { id: 'deepseek/deepseek-r1-0528:free', priority: 2, maxTokens: 8192, temperature: 0.7 },
    { id: 'minimax/minimax-m2:free', priority: 3, maxTokens: 8192, temperature: 0.7 }
  ]
};

// ============= MODEL HEALTH TRACKER =============
class ModelHealthTracker {
  constructor() {
    this.modelStats = new Map();
    this.failureThreshold = 3;
    this.recoveryTime = 300000;

    for (const models of Object.values(MODEL_POOL)) {
      for (const model of models) {
        this.modelStats.set(model.id, {
          failures: 0,
          successes: 0,
          lastFailure: null,
          lastSuccess: null,
          avgResponseTime: 0,
          totalRequests: 0,
          isHealthy: true,
          circuitBreakerOpen: false
        });
      }
    }
  }

  recordSuccess(modelId, responseTime) {
    const stats = this.modelStats.get(modelId);
    if (!stats) return;

    stats.successes++;
    stats.totalRequests++;
    stats.lastSuccess = Date.now();
    stats.avgResponseTime = 
      (stats.avgResponseTime * (stats.totalRequests - 1) + responseTime) / stats.totalRequests;
    
    if (stats.circuitBreakerOpen) {
      stats.circuitBreakerOpen = false;
      stats.failures = 0;
      console.log(`✅ Circuit breaker closed: ${modelId}`);
    }
  }

  recordFailure(modelId, error) {
    const stats = this.modelStats.get(modelId);
    if (!stats) return;

    stats.failures++;
    stats.totalRequests++;
    stats.lastFailure = Date.now();

    if (stats.failures >= this.failureThreshold) {
      stats.circuitBreakerOpen = true;
      stats.isHealthy = false;
      console.log(`⚠️  Circuit breaker opened: ${modelId} (${stats.failures} failures)`);
      
      setTimeout(() => {
        stats.failures = 0;
        stats.isHealthy = true;
        stats.circuitBreakerOpen = false;
        console.log(`🔄 Auto-recovery: ${modelId}`);
      }, this.recoveryTime);
    }
  }

  isModelHealthy(modelId) {
    const stats = this.modelStats.get(modelId);
    return stats ? (stats.isHealthy && !stats.circuitBreakerOpen) : true;
  }

  getHealthyModels(intent) {
    const models = MODEL_POOL[intent] || MODEL_POOL.general;
    return models
      .filter(m => this.isModelHealthy(m.id))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const statsA = this.modelStats.get(a.id);
        const statsB = this.modelStats.get(b.id);
        return statsA.avgResponseTime - statsB.avgResponseTime;
      });
  }

  getStats() {
    const stats = {};
    for (const [modelId, data] of this.modelStats.entries()) {
      stats[modelId] = {
        successRate: data.totalRequests > 0 
          ? ((data.successes / data.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
        avgResponseTime: Math.round(data.avgResponseTime) + 'ms',
        isHealthy: data.isHealthy,
        circuitBreaker: data.circuitBreakerOpen ? 'OPEN' : 'CLOSED',
        totalRequests: data.totalRequests
      };
    }
    return stats;
  }
}

// ============= MODEL SELECTOR =============
class ModelSelector {
  constructor(healthTracker) {
    this.healthTracker = healthTracker;
    this.lastUsedIndex = new Map();
    this.strategy = CONFIG.SELECTION_STRATEGY;
  }

  selectModel(intent) {
    const healthyModels = this.healthTracker.getHealthyModels(intent);
    
    if (healthyModels.length === 0) {
      console.warn(`⚠️  No healthy models for ${intent}, using fallback`);
      return MODEL_POOL.general[0];
    }

    switch (this.strategy) {
      case 'priority':
        return healthyModels[0];
      case 'round-robin':
        return this.roundRobinSelect(intent, healthyModels);
      case 'health-aware-round-robin':
      default:
        return this.healthAwareRoundRobin(intent, healthyModels);
    }
  }

  roundRobinSelect(intent, models) {
    const lastIndex = this.lastUsedIndex.get(intent) || 0;
    const nextIndex = (lastIndex + 1) % models.length;
    this.lastUsedIndex.set(intent, nextIndex);
    return models[nextIndex];
  }

  healthAwareRoundRobin(intent, models) {
    const weights = models.map(m => {
      const stats = this.healthTracker.modelStats.get(m.id);
      const successRate = stats.totalRequests > 0 ? stats.successes / stats.totalRequests : 1;
      const responseTimeFactor = stats.avgResponseTime > 0 ? 1000 / stats.avgResponseTime : 1;
      return successRate * responseTimeFactor * (4 - m.priority);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const random = Math.random() * totalWeight;
    
    let cumulative = 0;
    for (let i = 0; i < models.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) return models[i];
    }
    
    return models[0];
  }
}

// ============= REQUEST QUEUE =============
class RequestQueue {
  constructor(maxQueueSize, maxConcurrent) {
    this.queue = [];
    this.processing = 0;
    this.maxQueueSize = maxQueueSize;
    this.maxConcurrent = maxConcurrent;
    this.rejectedCount = 0;
  }

  async enqueue(task) {
    if (this.queue.length >= this.maxQueueSize) {
      this.rejectedCount++;
      throw new Error('Server overloaded. Retry after 5s');
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  async processNext() {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) return;

    this.processing++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.processing--;
      this.processNext();
    }
  }

  getStats() {
    return {
      queued: this.queue.length,
      processing: this.processing,
      rejected: this.rejectedCount
    };
  }
}

// ============= HTTP AGENT =============
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo'
});

// ============= MAIN SERVER =============
function startServer() {
  const fastify = Fastify({
    logger: CONFIG.NODE_ENV === 'development',
    requestTimeout: 120000,
    bodyLimit: 5242880,
    trustProxy: true,
    disableRequestLogging: CONFIG.NODE_ENV === 'production'
  });

  if (!CONFIG.OPENROUTER_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is required');
    process.exit(1);
  }

  const QUEUE_SIZE = CONFIG.MEMORY_MB < 1024 ? 50 : 100;
  const MAX_CONCURRENT = CONFIG.MEMORY_MB < 1024 ? 5 : 10;
  
  const requestQueue = new RequestQueue(QUEUE_SIZE, MAX_CONCURRENT);
  const healthTracker = new ModelHealthTracker();
  const modelSelector = new ModelSelector(healthTracker);

  // ============= AI REQUEST HANDLER =============
  async function makeAIRequest(messages, stream = false, maxRetries = 2) {
    const intent = detectIntent(messages[messages.length - 1].content);
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const modelConfig = modelSelector.selectModel(intent);
      const startTime = Date.now();

      try {
        const response = await fetch(CONFIG.OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CONFIG.OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': CONFIG.APP_URL,
            'X-Title': CONFIG.APP_NAME
          },
          body: JSON.stringify({
            model: modelConfig.id,
            messages,
            stream,
            temperature: modelConfig.temperature,
            max_tokens: modelConfig.maxTokens
          }),
          agent: keepAliveAgent
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const responseTime = Date.now() - startTime;
        healthTracker.recordSuccess(modelConfig.id, responseTime);

        return { response, model: modelConfig.id, intent, attempt };
      } catch (error) {
        lastError = error;
        healthTracker.recordFailure(modelConfig.id, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`All retries failed: ${lastError.message}`);
  }

  // ============= STREAM HANDLER =============
  async function handleStream(messages, reply) {
    const { response, model, intent, attempt } = await makeAIRequest(messages, true);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Model': model,
      'X-Intent': intent,
      'X-Retry-Attempt': attempt
    });

    reply.raw.write(`data: ${JSON.stringify({ model, intent, attempt })}\n\n`);

    let buffer = '';

    response.body.on('data', chunk => {
      if (reply.raw.destroyed) return;
      
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const content = line.slice(6).trim();
          if (content === '[DONE]') {
            reply.raw.write('data: [DONE]\n\n');
          } else {
            try {
              const parsed = JSON.parse(content);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                reply.raw.write(`data: ${JSON.stringify({ content: text })}\n\n`);
              }
            } catch (e) {}
          }
        }
      }
    });

    response.body.on('end', () => !reply.raw.destroyed && reply.raw.end());
    response.body.on('error', () => !reply.raw.destroyed && reply.raw.end());
    reply.raw.on('close', () => response.body.destroy());
  }

  // ============= NON-STREAM HANDLER =============
  async function handleNonStream(messages) {
    const { response, model, intent, attempt } = await makeAIRequest(messages, false);
    const data = await response.json();
    
    return {
      success: true,
      model,
      intent,
      retryAttempt: attempt,
      response: data.choices[0].message.content,
      usage: data.usage
    };
  }

  // ============= DOCUMENTATION UI =============
  fastify.get('/docs', async (request, reply) => {
    reply.type('text/html');
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI API Documentation & Testing</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 1.1em;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            margin-right: 8px;
            margin-top: 10px;
        }
        
        .badge-success { background: #10b981; color: white; }
        .badge-info { background: #3b82f6; color: white; }
        .badge-warning { background: #f59e0b; color: white; }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        @media (max-width: 1200px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
        
        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .card h2 {
            color: #667eea;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .card h3 {
            color: #764ba2;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        
        .method {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.8em;
            margin-right: 8px;
        }
        
        .method-get { background: #10b981; color: white; }
        .method-post { background: #3b82f6; color: white; }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }
        
        input, textarea, select {
            width: 100%;
            padding: 10px;
            border: 2px solid #e5e7eb;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        textarea {
            font-family: 'Courier New', monospace;
            resize: vertical;
            min-height: 100px;
        }
        
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-right: 10px;
            margin-top: 5px;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        button.secondary {
            background: #6b7280;
        }
        
        .response {
            background: #1e293b;
            color: #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            max-height: 400px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .response:empty {
            display: none;
        }
        
        .streaming-output {
            background: #1e293b;
            color: #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            max-height: 400px;
            overflow-y: auto;
            min-height: 100px;
        }
        
        .streaming-output:empty::before {
            content: 'Streaming output will appear here...';
            color: #64748b;
        }
        
        .info-box {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .success-box {
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #db2777;
        }
        
        pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 10px 0;
        }
        
        pre code {
            background: none;
            color: inherit;
            padding: 0;
        }
        
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            flex-wrap: wrap;
        }
        
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            background: none;
            color: #6b7280;
            font-weight: 600;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: all 0.3s;
        }
        
        .tab.active {
            color: #667eea;
            border-bottom-color: #667eea;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .health-status {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: #f9fafb;
            border-radius: 6px;
            margin-bottom: 10px;
        }
        
        .health-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #10b981;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        
        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        ul {
            margin-left: 20px;
            line-height: 2;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI API Documentation</h1>
            <p>High-performance API with intelligent model routing and automatic intent detection</p>
            <div>
                <span class="badge badge-success">Streaming Support</span>
                <span class="badge badge-info">Auto Model Selection</span>
                <span class="badge badge-warning">Health Monitoring</span>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h2>
                    <span class="method method-post">POST</span>
                    Non-Streaming Chat
                </h2>
                <div class="info-box">
                    <strong>Endpoint:</strong> <code>/api/chat</code><br>
                    Test the API with instant responses. The AI will automatically select the best model based on your prompt intent.
                </div>
                
                <form id="chatForm">
                    <div class="form-group">
                        <label>Your Prompt</label>
                        <textarea id="chatPrompt" placeholder="e.g., Write a Python function to reverse a string" rows="4"></textarea>
                    </div>
                    <button type="submit">Send Request</button>
                    <button type="button" class="secondary" onclick="document.getElementById('chatPrompt').value='Write a Python function to calculate fibonacci numbers'">Example: Coding</button>
                    <button type="button" class="secondary" onclick="document.getElementById('chatPrompt').value='Tell me a short story about a robot'">Example: Creative</button>
                </form>
                
                <div id="chatResponse" class="response"></div>
            </div>

            <div class="card">
                <h2>
                    <span class="method method-post">POST</span>
                    Streaming Chat
                </h2>
                <div class="info-box">
                    <strong>Endpoint:</strong> <code>/api/chat/stream</code><br>
                    Watch the AI response stream in real-time using Server-Sent Events (SSE).
                </div>
                
                <form id="streamForm">
                    <div class="form-group">
                        <label>Your Prompt</label>
                        <textarea id="streamPrompt" placeholder="e.g., Explain quantum computing in simple terms" rows="4"></textarea>
                    </div>
                    <button type="submit" id="streamBtn">Start Streaming</button>
                    <button type="button" class="secondary" id="stopStreamBtn" disabled>Stop Stream</button>
                </form>
                
                <div id="streamOutput" class="streaming-output"></div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h2>
                    <span class="method method-get">GET</span>
                    Simple Query
                </h2>
                <div class="info-box">
                    <strong>Endpoint:</strong> <code>/api/chat?q=your_question</code><br>
                    Quick queries via GET request with URL parameters.
                </div>
                
                <form id="getForm">
                    <div class="form-group">
                        <label>Query Parameter (q)</label>
                        <input type="text" id="getQuery" placeholder="What is 2 + 2?" />
                    </div>
                    <button type="submit">Send GET Request</button>
                </form>
                
                <div id="getResponse" class="response"></div>
            </div>

            <div class="card">
                <h2>
                    <span class="method method-get">GET</span>
                    Health & Stats
                </h2>
                <div class="health-status">
                    <div class="health-dot"></div>
                    <span>System Status: <strong id="systemStatus">Checking...</strong></span>
                </div>
                
                <button onclick="checkHealth()">Refresh Health Status</button>
                <button class="secondary" onclick="checkStats()">View Model Stats</button>
                
                <div id="healthResponse" class="response"></div>
            </div>
        </div>

        <div class="card">
            <h2>📚 Complete API Reference</h2>
            
            <div class="tabs">
                <button class="tab active" onclick="switchTab(event, 'endpoints')">Endpoints</button>
                <button class="tab" onclick="switchTab(event, 'intents')">Intent Detection</button>
                <button class="tab" onclick="switchTab(event, 'models')">Models</button>
                <button class="tab" onclick="switchTab(event, 'examples')">Code Examples</button>
            </div>

            <div id="endpoints" class="tab-content active">
                <h3>Available Endpoints</h3>
                
                <table>
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Endpoint</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="method method-post">POST</span></td>
                            <td><code>/api/chat</code></td>
                            <td>Non-streaming chat completion</td>
                        </tr>
                        <tr>
                            <td><span class="method method-post">POST</span></td>
                            <td><code>/api/chat/stream</code></td>
                            <td>Streaming chat completion (SSE)</td>
                        </tr>
                        <tr>
                            <td><span class="method method-get">GET</span></td>
                            <td><code>/api/chat?q=query</code></td>
                            <td>Simple query via GET</td>
                        </tr>
                        <tr>
                            <td><span class="method method-get">GET</span></td>
                            <td><code>/api/chat/stream?q=query</code></td>
                            <td>Streaming query via GET</td>
                        </tr>
                        <tr>
                            <td><span class="method method-get">GET</span></td>
                            <td><code>/health</code></td>
                            <td>System health & queue status</td>
                        </tr>
                        <tr>
                            <td><span class="method method-get">GET</span></td>
                            <td><code>/api/stats</code></td>
                            <td>Model performance statistics</td>
                        </tr>
                        <tr>
                            <td><span class="method method-get">GET</span></td>
                            <td><code>/docs</code></td>
                            <td>This documentation page</td>
                        </tr>
                    </tbody>
                </table>

                <h3>Request Format (POST)</h3>
                <pre><code>{
  "prompt": "Your question here",
  // OR
  "messages": [
    {"role": "user", "content": "Your message"}
  ]
}</code></pre>

                <h3>Response Format</h3>
                <pre><code>{
  "success": true,
  "model": "qwen/qwen-2.5-coder-32b-instruct:free",
  "intent": "coding",
  "retryAttempt": 0,
  "response": "AI response text here...",
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 45,
    "total_tokens": 57
  }
}</code></pre>
            </div>

            <div id="intents" class="tab-content">
                <h3>Automatic Intent Detection</h3>
                <div class="success-box">
                    The API automatically analyzes your prompt and routes it to the best model. No manual selection needed!
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Intent</th>
                            <th>Trigger Keywords</th>
                            <th>Best For</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Coding</strong></td>
                            <td>python, javascript, function, api, debug, code, algorithm</td>
                            <td>Programming tasks, code generation, debugging</td>
                        </tr>
                        <tr>
                            <td><strong>Math</strong></td>
                            <td>calculus, equation, calculate, matrix, solve, derivative</td>
                            <td>Mathematical problems, calculations, formulas</td>
                        </tr>
                        <tr>
                            <td><strong>Reasoning</strong></td>
                            <td>analyze, explain, compare, logic, why, evaluate</td>
                            <td>Complex analysis, logical reasoning, comparisons</td>
                        </tr>
                        <tr>
                            <td><strong>Creative</strong></td>
                            <td>story, poem, creative, narrative, write, compose</td>
                            <td>Creative writing, storytelling, content generation</td>
                        </tr>
                        <tr>
                            <td><strong>General</strong></td>
                            <td>Default fallback</td>
                            <td>General questions and conversations</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div id="models" class="tab-content">
                <h3>Available AI Models</h3>
                
                <div class="info-box">
                    <strong>All models are FREE!</strong> Powered by OpenRouter's free tier.
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Model</th>
                            <th>Specialty</th>
                            <th>Max Tokens</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Qwen 2.5 Coder 32B</td>
                            <td>Code generation, debugging</td>
                            <td>4,096</td>
                        </tr>
                        <tr>
                            <td>DeepSeek Chat v3.1</td>
                            <td>Advanced coding, technical</td>
                            <td>8,192</td>
                        </tr>
                        <tr>
                            <td>DeepSeek R1</td>
                            <td>Reasoning, analysis, math</td>
                            <td>8,192</td>
                        </tr>
                        <tr>
                            <td>Llama 3.3 8B</td>
                            <td>General purpose, balanced</td>
                            <td>4,096</td>
                        </tr>
                        <tr>
                            <td>MiniMax M2</td>
                            <td>Creative writing, storytelling</td>
                            <td>8,192</td>
                        </tr>
                    </tbody>
                </table>

                <h3>Model Selection Features</h3>
                <ul>
                    <li><strong>Health Monitoring:</strong> Circuit breaker disables failing models</li>
                    <li><strong>Auto Retry:</strong> Up to 3 attempts with exponential backoff</li>
                    <li><strong>Load Balancing:</strong> Health-aware round-robin distribution</li>
                    <li><strong>Fallback System:</strong> Emergency fallback if all models fail</li>
                </ul>
            </div>

            <div id="examples" class="tab-content">
                <h3>cURL Examples</h3>

                <h4>POST Request (Non-Streaming)</h4>
                <pre><code>curl -X POST https://mutlimodel-ai-api.onrender.com/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Write a hello world in Python"}'</code></pre>

                <h4>POST Request (Streaming)</h4>
                <pre><code>curl -N -X POST https://mutlimodel-ai-api.onrender.com/api/chat/stream \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Explain async/await"}'</code></pre>

                <h4>GET Request</h4>
                <pre><code>curl "https://mutlimodel-ai-api.onrender.com/api/chat?q=What+is+JavaScript"</code></pre>

                <h3>JavaScript/Fetch Examples</h3>

                <h4>Non-Streaming</h4>
                <pre><code>const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Explain async/await in JavaScript'
  })
});

const data = await response.json();
console.log(data.response);</code></pre>

                <h4>Streaming with Fetch</h4>
                <pre><code>const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Tell me a story'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  console.log(text);
}</code></pre>

                <h3>Python Example</h3>
                <pre><code>import requests

response = requests.post('https://mutlimodel-ai-api.onrender.com/api/chat', 
    json={'prompt': 'Calculate 25 * 37'}
)

data = response.json()
print(data['response'])</code></pre>

                <h3>Node.js Example</h3>
                <pre><code>const fetch = require('node-fetch');

async function chat() {
  const response = await fetch('https://mutlimodel-ai-api.onrender.com/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Explain promises in JavaScript'
    })
  });
  
  const data = await response.json();
  console.log(data.response);
}

chat();</code></pre>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('chatForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const prompt = document.getElementById('chatPrompt').value;
            const responseDiv = document.getElementById('chatResponse');
            
            if (!prompt.trim()) {
                responseDiv.textContent = 'Please enter a prompt';
                return;
            }
            
            responseDiv.textContent = 'Sending request...';
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                
                const data = await response.json();
                responseDiv.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                responseDiv.textContent = 'Error: ' + error.message;
            }
        });

        let currentReader = null;
        
        document.getElementById('streamForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const prompt = document.getElementById('streamPrompt').value;
            const outputDiv = document.getElementById('streamOutput');
            const streamBtn = document.getElementById('streamBtn');
            const stopBtn = document.getElementById('stopStreamBtn');
            
            if (!prompt.trim()) {
                outputDiv.textContent = 'Please enter a prompt';
                return;
            }
            
            outputDiv.textContent = 'Connecting...\\n';
            streamBtn.disabled = true;
            stopBtn.disabled = false;
            
            try {
                const response = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });

                const reader = response.body.getReader();
                currentReader = reader;
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                outputDiv.textContent += '\\n\\n[Stream Complete]';
                            } else {
                                try {
                                    const parsed = JSON.parse(data);
                                    if (parsed.content) {
                                        outputDiv.textContent += parsed.content;
                                        outputDiv.scrollTop = outputDiv.scrollHeight;
                                    } else if (parsed.model) {
                                        outputDiv.textContent += \`Model: \${parsed.model}\\nIntent: \${parsed.intent}\\n\\n\`;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                }
            } catch (error) {
                outputDiv.textContent += '\\n\\nError: ' + error.message;
            } finally {
                streamBtn.disabled = false;
                stopBtn.disabled = true;
                currentReader = null;
            }
        });

        document.getElementById('stopStreamBtn').addEventListener('click', () => {
            if (currentReader) {
                currentReader.cancel();
                currentReader = null;
            }
            document.getElementById('streamBtn').disabled = false;
            document.getElementById('stopStreamBtn').disabled = true;
            document.getElementById('streamOutput').textContent += '\\n\\n[Stopped by user]';
        });

        document.getElementById('getForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = document.getElementById('getQuery').value;
            const responseDiv = document.getElementById('getResponse');
            
            if (!query.trim()) {
                responseDiv.textContent = 'Please enter a query';
                return;
            }
            
            responseDiv.textContent = 'Sending request...';
            
            try {
                const response = await fetch('/api/chat?q=' + encodeURIComponent(query));
                const data = await response.json();
                responseDiv.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                responseDiv.textContent = 'Error: ' + error.message;
            }
        });

        async function checkHealth() {
            const responseDiv = document.getElementById('healthResponse');
            responseDiv.textContent = 'Checking...';
            
            try {
                const response = await fetch('/health');
                const data = await response.json();
                responseDiv.textContent = JSON.stringify(data, null, 2);
                document.getElementById('systemStatus').textContent = 'Healthy ✓';
            } catch (error) {
                responseDiv.textContent = 'Error: ' + error.message;
                document.getElementById('systemStatus').textContent = 'Error ✗';
            }
        }

        async function checkStats() {
            const responseDiv = document.getElementById('healthResponse');
            responseDiv.textContent = 'Loading stats...';
            
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                responseDiv.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                responseDiv.textContent = 'Error: ' + error.message;
            }
        }

        function switchTab(event, tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        }

        checkHealth();
    </script>
</body>
</html>
    `;
  });

  // ============= API ENDPOINTS =============
  
  fastify.post('/api/chat', async (request, reply) => {
    const { messages, prompt } = request.body;
    if (!messages && !prompt) {
      return reply.code(400).send({ error: 'messages or prompt required' });
    }

    const formattedMessages = messages || [{ role: 'user', content: prompt }];

    try {
      return await requestQueue.enqueue(() => handleNonStream(formattedMessages));
    } catch (error) {
      if (error.message.includes('overloaded')) {
        return reply.code(429).send({ error: error.message, retryAfter: 5 });
      }
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.post('/api/chat/stream', async (request, reply) => {
    const { messages, prompt } = request.body;
    if (!messages && !prompt) {
      return reply.code(400).send({ error: 'messages or prompt required' });
    }

    const formattedMessages = messages || [{ role: 'user', content: prompt }];

    try {
      await requestQueue.enqueue(() => handleStream(formattedMessages, reply));
    } catch (error) {
      if (error.message.includes('overloaded')) {
        return reply.code(429).send({ error: error.message, retryAfter: 5 });
      }
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get('/api/chat', async (request, reply) => {
    const { q } = request.query;
    if (!q) {
      return reply.code(400).send({ error: 'query parameter "q" required' });
    }

    try {
      return await requestQueue.enqueue(() => 
        handleNonStream([{ role: 'user', content: q }])
      );
    } catch (error) {
      if (error.message.includes('overloaded')) {
        return reply.code(429).send({ error: error.message, retryAfter: 5 });
      }
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get('/api/chat/stream', async (request, reply) => {
    const { q } = request.query;
    if (!q) {
      return reply.code(400).send({ error: 'query parameter "q" required' });
    }

    try {
      await requestQueue.enqueue(() => 
        handleStream([{ role: 'user', content: q }], reply)
      );
    } catch (error) {
      if (error.message.includes('overloaded')) {
        return reply.code(429).send({ error: error.message, retryAfter: 5 });
      }
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get('/health', async () => ({
    status: 'ok',
    pid: process.pid,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    uptime: Math.floor(process.uptime()) + 's',
    queue: requestQueue.getStats(),
    models: healthTracker.getStats()
  }));

  fastify.get('/api/stats', async () => ({
    models: healthTracker.getStats(),
    queue: requestQueue.getStats(),
    strategy: modelSelector.strategy,
    config: {
      memory: CONFIG.MEMORY_MB + 'MB',
      queueSize: QUEUE_SIZE,
      maxConcurrent: MAX_CONCURRENT
    }
  }));

  fastify.get('/', async (request, reply) => {
    reply.redirect('/docs');
  });

  fastify.listen({ port: CONFIG.PORT, host: CONFIG.HOST }, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`⚡ Worker ${process.pid} running on ${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`🎯 Strategy: ${modelSelector.strategy}`);
    console.log(`💾 Memory: ${CONFIG.MEMORY_MB}MB | Queue: ${QUEUE_SIZE} | Concurrent: ${MAX_CONCURRENT}`);
    console.log(`📚 Documentation: http://${CONFIG.HOST}:${CONFIG.PORT}/docs`);
  });

  const shutdown = async () => {
    console.log(`\n🛑 Shutting down worker ${process.pid}...`);
    await fastify.close();
    keepAliveAgent.destroy();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// ============= CLUSTER MODE =============
if (cluster.isMaster || cluster.isPrimary) {
  const numCPUs = Math.min(os.cpus().length, CONFIG.MEMORY_MB < 1024 ? 2 : 4);
  
  console.log('🚀 Advanced AI API Server');
  console.log(`📊 System: ${CONFIG.MEMORY_MB}MB RAM | ${os.cpus().length} CPUs`);
  console.log(`🔥 Spawning ${numCPUs} workers`);
  console.log(`🎯 Strategy: ${CONFIG.SELECTION_STRATEGY}`);
  console.log(`🌐 Environment: ${CONFIG.NODE_ENV}`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code) => {
    console.log(`💀 Worker ${worker.process.pid} died (code: ${code})`);
    console.log('🔄 Spawning replacement...');
    cluster.fork();
  });

} else {
  startServer();
}
