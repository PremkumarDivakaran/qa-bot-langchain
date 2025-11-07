# QA Bot - User Story Processing System

A comprehensive TypeScript-based system for ingesting, processing, and retrieving user stories using vector embeddings and LLM-powered standardization.

## 🚀 Features

- **📥 User Story Ingestion**: Upload and process CSV/TXT files with automatic vector embedding generation
- **🔍 Intelligent Retrieval**: Find similar user stories using vector search with Mistral embeddings
- **🤖 LLM Standardization**: Generate standardized user stories with GPT-4o-mini
- **🌐 Modern Web UI**: Responsive interface with drag-and-drop file upload and real-time processing
- **⚡ Vector Search**: MongoDB Atlas Vector Search with 1024-dimension embeddings
- **📊 Quality Scoring**: AI-powered quality assessment (0-100 scale)

## 🏗️ Architecture

- **Backend**: Express.js + TypeScript
- **Database**: MongoDB Atlas with Vector Search
- **Embeddings**: Mistral AI (mistral-embed, 1024 dimensions)
- **LLM**: GPT-4o-mini via Testleaf API
- **Frontend**: Vanilla JavaScript with modern CSS
- **Vector Store**: LangChain MongoDB integration

## 🛠️ Prerequisites

- Node.js >= 18.17
- MongoDB Atlas account with Vector Search enabled
- Mistral AI API key
- Testleaf API key (or OpenAI API key)

## ⚙️ Environment Setup

Create a `.env` file with the following configuration:

```bash
# Provider switch: groq | openai | anthropic
MODEL_PROVIDER=YOUR_MODEL_PROVIDER
TEMPERATURE=0.2
INGESTION_BATCH_SIZE=15

# Groq
GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct

# Testleaf
TESTLEAF_API_KEY=YOUR_TESTLEAF_API_KEY
TESTLEAF_MODEL=gpt-4o-mini

# OpenAI
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini

# Anthropic
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Mistral AI
MISTRAL_API_KEY=YOUR_MISTRAL_API_KEY
MISTRAL_EMBEDDING_MODEL=mistral-embed

# MongoDB Configuration
MONGODB_DB_NAME=RAG_DEMO
MONGODB_COLLECTION=user_stories
MONGODB_VECTOR_INDEX=user_stories_vector_index
MONGODB_URI=YOUR_MONGODB_URI

# Embeddings Configuration
EMBEDDING_PROVIDER=mistral
EMBEDDING_MODEL=mistral-embed
EMBEDDING_DIMENSION=1024

# LLM Re-ranking Configuration
LLM_RERANKING_ENABLED=false  
LLM_RETRIEVAL_TOP_K=25          

# Logging Configuration
ENABLE_DETAILED_LOGS=false

# Documents Configuration
DOCUMENTS_FOLDER=./documents

# Weights for scoring
vectorWeight=0.7
keywordWeight=0.3

# Server
SERVER_URL=http://localhost:8787

# User Story Documents Configuration
USER_STORY_DOCUMENTS_FOLDER=./user_stories
USER_STORY_DB_NAME=RAG_DEMO
USER_STORY_COLLECTION=user_stories
USER_STORY_VECTOR_INDEX=user_stories_vector_index
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Vector Index (First Time Setup)
```bash
npm run create-user-story-index  # Provides steps to manually create index in MongoDB Atlas
```

### 3. Start the Application
```bash
# Start both backend and frontend
npm run start:app

# Or start individually
npm run start:backend  # API server on port 8787
npm run start:frontend # UI server on port 3000
```

### 4. Access the Application
- **Web UI**: http://localhost:3000
- **API**: http://localhost:8787

## 📋 Available Scripts

### Application Management
```bash
npm run start:app      # Start both backend and frontend
npm run stop:app       # Stop both services
npm run restart:app    # Restart both services
npm run status         # Check service status
```

### Individual Services
```bash
npm run start:backend    # Start API server only
npm run start:frontend   # Start UI server only
npm run stop:backend     # Stop API server
npm run stop:frontend    # Stop UI server
```

### User Story Operations
```bash
npm run ingest:user-stories       # Ingest user stories (append)
npm run ingest:user-stories:clear # Ingest user stories (clear existing)
npm run create-user-story-index   # Get steps to manually create vector search index
npm run verify-user-story-index   # Verify vector index exists
```

### Development
```bash
npm run dev           # Start backend in development mode
npm run build         # Build TypeScript to JavaScript
npm run typecheck     # Type checking only
```

## 🌐 Web Interface

### Ingestion Tab
- **Drag & Drop Upload**: Intuitive file upload with validation
- **File Support**: CSV and TXT formats
- **Real-time Progress**: Visual progress tracking with status updates
- **Error Handling**: Comprehensive error reporting
- **Clear Option**: Option to clear existing data before ingestion

### Retrieval Tab
- **User Story Input**: Large text area for story input
- **Relevant Stories Limit**: Dropdown to select number of similar stories (3, 5, 7, 10)
- **Quality Scoring**: AI-generated quality score (0-100)
- **Generated Story Display**: Clean, formatted output with all story fields
- **Relevant Stories Table**: Sortable table with similarity scores and metadata
- **Export Function**: Download results as JSON

## 🔌 API Endpoints

### User Story Ingestion
```http
POST /ingest/user-stories
Content-Type: multipart/form-data

# Form data:
# file: CSV or TXT file
# clear: boolean (optional, default: false)
```

**Response:**
```json
{
  "success": true,
  "message": "User stories ingested successfully",
  "stats": {
    "totalFiles": 1,
    "userStoriesProcessed": 150,
    "added": 140,
    "duplicatesReplaced": 10,
    "duration": 45000
  }
}
```

### User Story Retrieval
```http
POST /retrieve/user-stories
Content-Type: application/json
```

#### Request Body Options

**1. Hybrid Search (Default - Combines Vector + BM25):**
```json
{
  "userInput": "As a nurse, I want to manage patient registration",
  "relevantStoriesLimit": 5,
  "searchMode": "hybrid",
  "vectorWeight": 50,
  "bm25Weight": 50
}
```

**2. Vector Search Only (Semantic Similarity):**
```json
{
  "userInput": "As a nurse, I want to manage patient registration",
  "relevantStoriesLimit": 5,
  "searchMode": "vector",
  "vectorWeight": 100,
  "bm25Weight": 0
}
```

**3. BM25 Search Only (Keyword-based):**
```json
{
  "userInput": "As a nurse, I want to manage patient registration",
  "relevantStoriesLimit": 5,
  "searchMode": "bm25",
  "vectorWeight": 0,
  "bm25Weight": 100
}
```

**4. Custom Weight Hybrid (Example: 70% Vector, 30% BM25):**
```json
{
  "userInput": "As a nurse, I want to manage patient registration",
  "relevantStoriesLimit": 7,
  "searchMode": "hybrid", 
  "vectorWeight": 70,
  "bm25Weight": 30
}
```

#### Request Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userInput` | string | Yes | - | User story text to process |
| `relevantStoriesLimit` | number | No | 5 | Number of similar stories to retrieve (3-10) |
| `searchMode` | string | No | "hybrid" | Search algorithm: "vector", "bm25", or "hybrid" |
| `vectorWeight` | number | No | 50 | Vector search weight percentage (0-100) |
| `bm25Weight` | number | No | 50 | BM25 search weight percentage (0-100) |

#### Search Modes Explained

**🔍 Vector Search (`"vector"`):**
- Uses semantic similarity with 1024-dimension embeddings
- Best for: Finding conceptually similar stories
- Example: "patient registration" matches "user enrollment", "member signup"

**📝 BM25 Search (`"bm25"`):**
- Uses keyword-based relevance scoring
- Best for: Finding exact keyword matches
- Example: "patient registration" matches stories containing those exact terms

**⚡ Hybrid Search (`"hybrid"`):**
- Combines both vector and BM25 search results
- Weighted scoring: `finalScore = (vectorScore × vectorWeight/100) + (bm25Score × bm25Weight/100)`
- Best for: Balanced semantic and keyword relevance

**Response:**
```json
{
  "createdUserStory": {
    "storyId": "USR-1762191517564",
    "summary": "Patient Registration Management",
    "description": "As a nurse, I want to manage patient registration...",
    "acceptanceCriteria": "Given a nurse user, when they access...",
    "priority": "high",
    "risk": "medium"
  },
  "relevantUserStories": [
    {
      "storyId": "HC-220",
      "title": "Nurse Activities",
      "description": "As a user, I want to nurse activities...",
      "priority": "critical",
      "category": "Ward - Nursing",
      "score": 0.85
    }
  ],
  "score": 85,
  "query": "As a nurse, I want to manage patient registration",
  "resultCount": 5,
  "duration": 13537,
  "metadata": {
    "traceId": "retrieve_1762323738614_kk5obo7jh",
    "model": "testleaf",
    "embedding": "mistral/mistral-embed"
  }
}
```

## 📊 CSV File Format

For ingestion, use CSV files with the following structure:

```csv
ID,Summary,User Story,Description,Priority,Category,Status
US-001,User Login,As a user I want to login,User authentication story,High,Authentication,Active
US-002,Data Export,As an admin I want to export data,Data export functionality,Medium,Admin,Pending
```

**Supported Columns:**
- `ID`, `Story ID`, `User Story ID`: Unique identifier
- `Summary`, `Title`: Brief description
- `User Story`, `Description`, `Text`: Full story text
- `Priority`: high, medium, low, critical
- `Category`, `Epic`, `Feature`: Story categorization
- `Status`: Active, Pending, Done, etc.

## 🔄 User Story Retrieval Process

### Simple Process Flow
**User Input → Vector Embedding → Vector DB Search → LLM Analysis → Standardized Output**

### Detailed Steps

#### 1. **User Input** 📝
- User enters a user story (e.g., "As a nurse, I want to manage patient registration")

#### 2. **Convert to Vector** �
- System converts user input to a 1024-dimension vector using Mistral AI embeddings
- This vector represents the "meaning" of the user story

#### 3. **Semantic Search in Vector DB** 🔍
- System searches MongoDB Atlas Vector Search index for similar vectors
- Finds user stories with similar "meaning" (not just matching words)
- Returns top similar stories with similarity scores

#### 4. **LLM Processing with Prompt Template** 🤖
- System uses a structured prompt template that includes:
  - **Instructions**: Clear guidance for the LLM
  - **Context**: User input + similar stories from vector search
  - **Expected Format**: Standardized fields (summary, priority, risk, etc.)
  - **Constraints**: Must use P1/P2/P3/P4 priority format from existing data
  - **Persona**: Expert assistant with healthcare domain knowledge

**Prompt Template Structure:**
```
Instruction: [Role and guidelines]
Question: [Format user story task]
Context: 
  - User Input: [Original story]
  - Vector DB Fetch: [Similar stories from step 3]
Expected Result: [Standardized fields + relevance scoring]
Tone: [Professional, factual]
Output Format: [Clear structure requirements]
Persona: [QA/Healthcare expert]
```

#### 5. **Field Extraction & Formatting** ✨
- System extracts specific fields from LLM response:
  - Story ID, Summary, Description, Acceptance Criteria, Priority, Risk Level
- Converts priority to P1/P2/P3/P4 format based on vector DB patterns
- Cleans up any extra characters (*:) from LLM output

#### 6. **Quality Scoring** 📊
- LLM provides a quality score (0-100) for the generated story
- Based on completeness, clarity, and adherence to user story standards

#### 7. **Return Results** 📤
- System returns:
  - **Generated Story**: New standardized user story
  - **Similar Stories**: List of relevant existing stories with scores
  - **Quality Score**: AI assessment of the generated story

### Key Features
- ✅ **Data-Driven**: Based on existing story patterns in vector DB
- ✅ **Contextual**: Uses semantic similarity, not just keyword matching  
- ✅ **Standardized**: Consistent P1-P4 priority format and field structure
- ✅ **Quality Assured**: AI-powered scoring and validation

### Manual Testing
1. **Access the UI**: http://localhost:3000
2. **Test Ingestion**:
   - Upload a CSV file with user stories
   - Monitor progress and verify results
3. **Test Retrieval**:
   - Enter: "As a nurse, I want to manage patient registration"
   - Set relevant stories limit to 5
   - Verify quality score and similar stories

### Test Cases

#### Healthcare User Story
```
Input: "As a nurse, I want to manage patient registration so that I can track patient information"
Expected: Quality score 75-90, relevant healthcare stories
```

#### Simple User Story
```
Input: "As a user, I want to login"
Expected: Quality score 60-80, authentication-related stories
```

#### Complex User Story
```
Input: "As a hospital administrator, I want to generate comprehensive reports about patient care metrics"
Expected: Quality score 80-95, admin/reporting stories
```

## 🔧 Configuration

### Embedding Providers
- **Mistral** (recommended): Fast, high-quality embeddings
- **OpenAI**: Alternative embedding provider

### LLM Models
- **GPT-4o-mini** (via Testleaf): Cost-effective, fast
- **GPT-4** (via OpenAI): Higher quality, slower

### Vector Index Configuration
```javascript
{
  "name": "user_stories_vector_index",
  "dimension": 1024,
  "similarity": "cosine",
  "collection": "user_stories"
}
```

## 📋 Logging System

The system features a sophisticated two-tier logging system that provides both overview and detailed insights based on your needs.

### Configuration
Control logging verbosity with a single environment variable:

```bash
# Overview mode: Clean, progress-focused logs
ENABLE_DETAILED_LOGS=false

# Detailed mode: Comprehensive logging with payloads and step-by-step details
ENABLE_DETAILED_LOGS=true
```

### Overview Mode (`ENABLE_DETAILED_LOGS=false`)
Perfect for production and clean monitoring. Shows essential progress and status information.

**Ingestion Pipeline:**
```
[API] 🚀 Starting user story ingestion pipeline with vector embeddings
[API] 📊 Configuration:
[API]   - Database: RAG_DEMO.user_stories
[API]   - Embedding Provider: mistral
[API]   - Embedding Model: mistral-embed
[API]   - Dimension: 1024
[API] [STATUS] 🚀 === USER STORY INGESTION PIPELINE STARTED ===
[API] 🗑️  Clearing existing user stories...
[API] 📂 Reading documents from: ./user_stories
[API] ✓ Found 1 user story file(s)
[API] 📝 Processing user stories...
[API] [STATUS] 📄 Processing file: userstories_ingestion.csv
[API] [STATUS] 🔄 Generating embeddings and storing 190 user story(ies)
[API] [STATUS] ✅ === USER STORY INGESTION COMPLETE ===
[API]   - Warnings: 0
[API] [STATUS] Ingestion completed successfully in 3498ms
```

**Retrieval Pipeline:**
```
[API] [STATUS] 🚀 === USER STORY RETRIEVAL PROCESS STARTED ===
[API] [STATUS] 📝 Step 1: User input received: "As a nurse, I want to manage patient registration"
[API] [STATUS] 🎯 Step 2: Relevant stories limit set to: 5
[API] [STATUS] 🔍 Step 3: Converting input to embeddings and performing vector search
[API] [STATUS] 🤖 Step 3.2: Applying LLM re-ranking to improve relevance
[API] [STATUS] 📋 Step 4: Formatting search results for LLM prompt
[API] [STATUS] 🤖 Step 5: Generating standardized user story with LLM
[API] [STATUS] 🔧 Step 6: Parsing LLM response and extracting user story fields
[API] [STATUS] ✅ Retrieval completed in 23742ms
```

### Detailed Mode (`ENABLE_DETAILED_LOGS=true`)
Comprehensive logging for development, debugging, and system analysis. Includes all overview logs plus detailed information.

**Additional Ingestion Details:**
- Individual row processing with full CSV payloads
- Extraction details for each user story
- Batch processing information
- Complete statistics breakdown
- Detailed error and warning information
- MongoDB connection and indexing details

**Additional Retrieval Details:**
- Vector search configuration and parameters
- Initial search results with similarity scores
- LLM re-ranking process with document scores
- Complete prompt templates and LLM responses
- Document conversion and formatting steps
- Quality scoring breakdown

**Example Detailed Log Excerpt:**
```
[API] [DETAILED] Step 3: Starting vector search process
[API] [DETAILED] LLM Re-ranking: ENABLED
[API] [DETAILED] Initial vector search count: 25
[API] [DETAILED] Final results needed: 5
[API] [DETAILED] Vector search returned 25 initial results
[API] [DETAILED] Initial Results Summary:
[API] [DETAILED]   1. HC-220 - "Nurse Activities Nurse Notes" (score: 0.856)
[API] [DETAILED]   2. HC-189 - "Nurse Dashboard View Request" (score: 0.834)
[API] [DETAILED] Step 3.2: Starting LLM re-ranking process
[API] [DETAILED] Re-ranking 25 documents to select top 5
[API] [DETAILED] LLM re-ranking completed. Final count: 5
```

### Log Levels and Components

#### Status Logs (Always Visible)
- **PURPOSE**: Essential progress tracking and system status
- **AUDIENCE**: Operations, monitoring, production
- **FORMAT**: `[STATUS] [traceId] 🚀 message`

#### Detailed Logs (Conditional)
- **PURPOSE**: Development, debugging, performance analysis
- **AUDIENCE**: Developers, system administrators
- **FORMAT**: `[DETAILED] [traceId] detailed information`

#### Error Logs (Always Visible)
- **PURPOSE**: Error tracking and troubleshooting
- **AUDIENCE**: All stakeholders
- **FORMAT**: `[ERROR] [traceId] ❌ error message`

### Trace IDs
Every request gets a unique trace ID for end-to-end tracking:
```
Format: operation_timestamp_randomstring
Example: retrieve_1762323738614_kk5obo7jh
```

### Best Practices

#### Production Environments
- Set `ENABLE_DETAILED_LOGS=false`
- Monitor STATUS and ERROR logs
- Use trace IDs for issue investigation

#### Development Environments
- Set `ENABLE_DETAILED_LOGS=true`
- Review detailed logs for optimization
- Analyze payload structures and processing steps

#### Performance Monitoring
- STATUS logs include timing information
- Track ingestion and retrieval durations
- Monitor batch processing efficiency

## 📁 Project Structure

```
qa-bot-langchain/
├── src/
│   ├── config/           # Configuration management
│   ├── lib/             # Core libraries and utilities
│   ├── pipelines/       # Ingestion pipelines
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── server.ts        # Main Express server
├── client/              # Frontend web interface
│   ├── index.html       # Main UI
│   ├── styles.css       # Styling
│   └── script.js        # Frontend logic
├── scripts/             # Shell scripts for service management
└── user_stories/        # User story documents (create this)
```

## 🛠️ Troubleshooting

### Common Issues

1. **Server not starting**: Check MongoDB connection and API keys
2. **Vector search failing**: Verify vector index exists with `npm run verify-user-story-index`
3. **No similar stories found**: Ensure user stories are ingested first
4. **Long response times**: Normal for complex queries (10-30 seconds)
5. **Vector index setup**: Use `npm run create-user-story-index` to get manual setup instructions

### Debug Information
- All requests include trace IDs for debugging
- Server logs show detailed processing steps
- Browser console shows API request/response details

### Port Issues
```bash
# Check what's running on ports
lsof -i :8787  # Backend
lsof -i :3000  # Frontend

# Kill processes if needed
npm run stop:app
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is private and intended for internal use only.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs for error details
3. Verify configuration and API keys
4. Test with simple user stories first

---

**Built with ❤️ using TypeScript, LangChain, MongoDB Atlas, and Mistral AI**
