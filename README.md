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
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=RAG_DEMO

# User Story Configuration
USER_STORY_DB_NAME=RAG_DEMO
USER_STORY_COLLECTION=user_stories
USER_STORY_VECTOR_INDEX=user_stories_vector_index

# API Keys
MISTRAL_API_KEY=your_mistral_api_key
TESTLEAF_API_KEY=your_testleaf_api_key
# OR
OPENAI_API_KEY=your_openai_api_key

# Embedding Configuration
EMBEDDING_PROVIDER=mistral
EMBEDDING_MODEL=mistral-embed
EMBEDDING_DIMENSION=1024

# Server Configuration
PORT=8787
HOST=localhost
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

{
  "userInput": "As a nurse, I want to manage patient registration",
  "relevantStoriesLimit": 5
}
```

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
  "duration": 13537
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

## 🧪 Testing

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
