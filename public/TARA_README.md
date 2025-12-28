# TARA - Technical Assistance & Response Agent

<div align="center">

**Built by [DaVinci AI](https://davinciai.in)**

*A Next-Generation Voice AI Platform powered by Modular Multi-Agentic RAG (MMAR)*

---

🎯 **Enterprise-Grade** | 🌍 **Multilingual** | 🧠 **Self-Learning** | ⚡ **Real-Time**

</div>

---

## 🚀 What is TARA?

**TARA** (Technical Assistance & Response Agent) is an advanced conversational AI platform designed for enterprise customer service. Unlike traditional chatbots, TARA combines **real-time voice interaction**, **intelligent knowledge retrieval**, and **collective learning** to deliver human-like support experiences.

### Key Differentiators

| Feature | Traditional Bots | TARA |
|---------|-----------------|------|
| Response Time | 2-5 seconds | **< 500ms** (first chunk) |
| Knowledge Source | Static FAQs | **Dynamic RAG + Hive Mind** |
| Language Support | Single language | **Auto-detect & Multilingual** |
| Learning | Manual updates | **Self-learning from interactions** |
| Voice Quality | Robotic TTS | **Natural, emotive speech** |

---

## 🏗️ MMAR Architecture

### Modular Multi-Agentic RAG (MMAR)

TARA's core innovation is the **MMAR Architecture** - a modular system where specialized agents collaborate to deliver accurate, contextual responses.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MMAR ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   STT       │    │ ORCHESTRATOR│    │    RAG      │    │    TTS      │  │
│  │   Agent     │───▶│    Agent    │───▶│   Agent     │───▶│   Agent     │  │
│  │ (LemonFox)  │    │ (Pipeline)  │    │  (MMAR)     │    │ (ElevenLabs)│  │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘    └─────────────┘  │
│                            │                  │                             │
│                            ▼                  ▼                             │
│                    ┌───────────────────────────────────┐                   │
│                    │        MMAR SUB-AGENTS            │                   │
│                    ├───────────────────────────────────┤                   │
│                    │ 🔄 Translation Agent (Groq LPU)   │                   │
│                    │ 🎯 Pattern Matcher Agent          │                   │
│                    │ 📚 FAISS Retriever Agent          │                   │
│                    │ 🧠 Hive Mind Agent (Qdrant)       │                   │
│                    │ 🌐 Web Search Agent (Google)      │                   │
│                    │ 💬 LLM Generator Agent (Gemini)   │                   │
│                    └───────────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How MMAR Works

1. **Translation Agent** - Auto-detects language and translates to English for unified processing
2. **Pattern Matcher** - Identifies query type (pricing, installation, contact) for optimized routing
3. **FAISS Retriever** - Searches local knowledge base with semantic similarity
4. **Hive Mind Agent** - Queries collective memory for proven solutions
5. **Web Search Agent** - Fetches real-time information when needed
6. **LLM Generator** - Synthesizes context into natural, humanized responses

---

## ✨ Core Features

### 🌍 Intelligent Multilingual Support

- **Auto-Detection**: Recognizes 15+ languages from speech
- **Pivot Translation**: Translates queries to English for unified search
- **Native Response**: Generates responses in user's original language
- **Ultra-Fast Translation**: Powered by Groq LPU (< 300ms)

```
User speaks German → Groq translates → English search → German response
"Wie funktioniert das Pricing?" → Search → "Daytona hat ein Pay-as-you-go-Modell..."
```

### 🧠 Hive Mind - Collective Intelligence

The revolutionary **Hive Mind** system enables TARA to learn from every successful interaction:

- **Collective Memory**: Solutions stored in Qdrant vector database
- **Cross-User Learning**: One user's solved issue helps all future users
- **Semantic Search**: Finds relevant solutions even with different wording
- **Attribution Tracking**: Maintains provenance of solutions
- **GDPR Compliant**: One-click user data deletion

```
User A solves pricing question → Saved to Hive Mind
User B asks similar question → Retrieves User A's solution instantly
```

### ⚡ Ultra-Low Latency Pipeline

TARA achieves **sub-500ms** first response through:

| Stage | Target | Technology |
|-------|--------|------------|
| STT | < 100ms | LemonFox FastRTC |
| Translation | < 250ms | Groq LPU |
| Embedding | < 100ms | Fast sentence-transformers |
| Retrieval | < 50ms | FAISS + Qdrant parallel |
| LLM TTFT | < 500ms | Gemini 1.5 Flash |
| TTS | Real-time | ElevenLabs WebSocket |

### 🎯 Hybrid RAG with Pattern Matching

TARA uses intelligent query routing for optimal accuracy:

- **Rule-Based Patterns**: Instant responses for known query types
- **FAISS Vector Search**: Semantic similarity on local docs
- **Hive Mind Search**: Collective team knowledge
- **Web Search Fallback**: Real-time information from Google
- **Dynamic Boosting**: Adjusts source priority based on context

### 💬 Humanized Response Generation

Responses are crafted to sound natural, not robotic:

- ❌ "Here's how you can: 1. Step one 2. Step two"
- ✅ "Hey there! You can install Daytona with pip... or if you prefer npm..."

### 🔄 Real-Time Streaming

- **Text Streaming**: Chunks delivered as generated
- **Audio Streaming**: TTS synthesizes in real-time
- **Interrupt Support**: Barge-in detection for natural conversation

### 📊 Session Intelligence

- **Conversation History**: Maintains context across turns
- **Context-Dependent Detection**: Handles "What did I just ask?"
- **Automatic Session Save**: Successful interactions saved to Hive Mind
- **Performance Metrics**: Timing breakdown for optimization

---

## 🛠️ Technical Stack

### Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE STACK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Orchestrator │  │   RAG        │  │    STT       │          │
│  │  :8038        │  │   :8100      │  │   LemonFox   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    TTS       │  │    Redis     │  │   Qdrant     │          │
│  │  ElevenLabs  │  │   :6382      │  │  (Cloud)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Orchestrator** | FastAPI + WebSocket | Session management, pipeline coordination |
| **RAG Engine** | FAISS + Qdrant + Gemini | Knowledge retrieval & generation |
| **STT** | LemonFox (FastRTC) | Real-time speech recognition |
| **TTS** | ElevenLabs | Natural voice synthesis |
| **Translation** | Groq LPU | Ultra-fast multilingual support |
| **Cache** | Redis | Response caching, session state |
| **Vector Store** | Qdrant Cloud | Hive Mind collective memory |
| **LLM** | Google Gemini 1.5 Flash | Response generation |

---

## 📈 Performance Metrics

### Typical Response Flow

```
Total Time: ~2000ms (end-to-end)
├── Embedding: 100ms
├── Parallel Retrieval: 400ms
│   ├── FAISS: 50ms
│   ├── Hive Mind: 300ms
│   └── Web Search: 500ms (if triggered)
├── First Token (TTFT): 500ms
└── Full Generation: 600ms
```

### Benchmarks

| Metric | Value |
|--------|-------|
| First Chunk Latency | < 500ms |
| Total Response Time | < 2500ms |
| Cache Hit Rate | Up to 80% |
| Hive Mind Recall | 0.35 threshold |
| Languages Supported | 15+ |

---

## 🎯 Use Cases

### Customer Service
- **Technical Support**: Answers product questions with context
- **Pricing Inquiries**: Accurate, up-to-date pricing info
- **Installation Help**: Step-by-step guidance in natural language

### Enterprise Knowledge Base
- **Internal FAQ**: Self-service for employees
- **Onboarding**: New hire assistance
- **Documentation Search**: Natural language doc queries

### Voice Interfaces
- **Phone Support**: IVR replacement with AI
- **Voice Apps**: Browser-based voice UI
- **Accessibility**: Screen-reader friendly responses

---

## 🔒 Security & Compliance

- **GDPR Compliant**: User data deletion on request
- **Data Isolation**: Per-customer Qdrant collections
- **Secure APIs**: Token-based authentication
- **Audit Logging**: Full interaction history

---

## 🚀 Getting Started

### Quick Deploy

```bash
# Clone repository
git clone https://github.com/davinciai/tara-microservice

# Configure environment
cp .env.example .env
# Add API keys: GEMINI_API_KEY, ELEVENLABS_API_KEY, GROQ_API_KEY, etc.

# Launch stack
docker compose -f docker-compose-daytona.yml up -d

# Access UI
open http://localhost:8038/static/client.html
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/query` | POST | RAG query (non-streaming) |
| `/api/v1/stream_query` | POST | RAG query (streaming) |
| `/api/v1/save_case` | POST | Save to Hive Mind |
| `/health` | GET | Service health check |

---

## 📞 Contact

**DaVinci AI**
- Website: [davinciai.in](https://davinciai.in)
- Email: contact@davinciai.in

---

<div align="center">

*TARA is continuously learning and improving with every interaction.*

**Built with ❤️ by DaVinci AI**

</div>
