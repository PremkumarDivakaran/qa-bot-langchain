# QA Bot - User Story Processing System - Documentation

## Overview

This QA Bot is a TypeScript-based application built with LangChain that focuses specifically on user story processing and retrieval using vector embeddings and AI-powered standardization. It features a modern web interface with hybrid search capabilities combining vector similarity and BM25 keyword search.

## Features

### � User Story Ingestion
- **File Upload**: Support for CSV and TXT files containing user stories
- **Batch Processing**: Process multiple user stories with automatic vector embedding generation
- **Progress Tracking**: Real-time progress indicators during ingestion
- **Vector Embeddings**: Automatic generation using Mistral AI (1024 dimensions)
- **Error Handling**: Comprehensive validation and error reporting

### 🔍 Hybrid User Story Retrieval
- **Vector Search**: Semantic similarity using embeddings
- **BM25 Search**: Keyword-based relevance scoring with MongoDB text search
- **Hybrid Search**: Configurable weighted combination of both search methods
- **Interactive Controls**: Real-time slider to balance vector vs keyword search
- **Quality Scoring**: AI-powered assessment of generated user stories (0-100 scale)
- **Story Generation**: Create standardized user stories based on existing patterns

### 🎛️ Advanced Search Controls
- **Search Mode Selection**: Choose between Vector, BM25, or Hybrid search
- **Weight Balancing**: Adjust the balance from 100% Vector to 100% BM25
- **Real-time Updates**: Automatic search mode switching based on weight slider
- **Custom Limits**: Configure number of relevant stories to retrieve (3-10)

## Getting Started

### Prerequisites
- Node.js 18.17 or higher
- MongoDB Atlas with Vector Search capability
- Mistral AI API key
- Testleaf API key (or OpenAI API key)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qa-bot-langchain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with the following variables:
   ```env
   # Model Provider
   MODEL_PROVIDER=testleaf
   TEMPERATURE=0.2
   
   # Testleaf API
   TESTLEAF_API_KEY=your_testleaf_api_key
   TESTLEAF_MODEL=gpt-4o-mini
   
   # Mistral AI (for embeddings)
   MISTRAL_API_KEY=your_mistral_api_key
   
   # MongoDB Atlas
   MONGODB_URI=your_mongodb_atlas_uri
   MONGODB_DB_NAME=RAG_DEMO
   MONGODB_COLLECTION=user_stories
   MONGODB_VECTOR_INDEX=user_stories_vector_index
   
   # Embeddings Configuration
   EMBEDDING_PROVIDER=mistral
   EMBEDDING_MODEL=mistral-embed
   EMBEDDING_DIMENSION=1024
   ```

### Running the Application

#### Start Both Frontend and Backend
```bash
npm run start:app
```

#### Start Services Individually
```bash
# Backend API Server (port 8787)
npm run start:backend

# Frontend UI Server (port 8080)
npm run start:frontend
```

#### Development Mode
```bash
npm run dev
```

### First Time Setup

1. **Create Vector Index**
   ```bash
   npm run create-user-story-index
   ```
   This provides instructions for manually creating the vector search index in MongoDB Atlas.

2. **Verify Index**
   ```bash
   npm run verify-user-story-index
   ```

## Usage Guide

### User Story Ingestion

1. **Navigate to the Ingestion Tab**
   - Access the web UI at http://localhost:8080
   - Click on "User Story Retrieval" → "Ingestion" tab

2. **Upload User Stories**
   - Drag and drop CSV/TXT files into the upload zone
   - Supported format: CSV with columns like ID, Summary, User Story, Description, Priority, Category
   - Choose whether to clear existing data before upload

3. **Monitor Processing**
   - Real-time progress bar shows embedding generation
   - Detailed logs display processing steps
   - Statistics show total stories processed and duplicates replaced

### Hybrid Search & Retrieval

1. **Access the Retrieval Tab**
   - Switch to the "Retrieval" tab

2. **Configure Search Method**
   - **Search Mode Dropdown**: Vector Only, BM25 Only, or Hybrid
   - **Weight Slider**: Balance between Vector (0%) and BM25 (100%)
   - **Auto-switching**: Slider automatically changes search mode at extremes

3. **Enter Your Query**
   - Describe the user story you're looking for
   - Example: "As a nurse, I want to manage patient registration"

4. **Configure Parameters**
   - **Result Limit**: Number of similar stories to retrieve (3-10)
   - **Real-time Weight Display**: Shows current Vector/BM25 percentages

5. **Review Results**
   - **Generated Story**: AI-standardized user story with all required fields
   - **Quality Score**: Automated assessment (0-100)
   - **Relevant Stories Table**: Existing stories ranked by similarity
   - **Search Metadata**: Shows which search method was used

## API Reference

### User Story Ingestion

#### Upload User Stories
```http
POST /ingest/user-stories
Content-Type: multipart/form-data

Parameters:
- file: CSV or TXT file containing user stories
- clear: boolean (optional, clears existing data)
```

### User Story Retrieval with Hybrid Search

#### Search and Generate User Stories
```http
POST /retrieve/user-stories
Content-Type: application/json
```

**Hybrid Search Request (Default):**
```json
{
  "userInput": "As a nurse, I want to manage patient registration",
  "relevantStoriesLimit": 5,
  "searchMode": "hybrid",
  "vectorWeight": 50,
  "bm25Weight": 50
}
```

**Vector-Only Search:**
```json
{
  "userInput": "As a nurse, I want to manage patient registration",
  "relevantStoriesLimit": 5,
  "searchMode": "vector",
  "vectorWeight": 100,
  "bm25Weight": 0
}
```

**BM25-Only Search:**
```json
{
  "userInput": "As a nurse, I want to manage patient registration",
  "relevantStoriesLimit": 5,
  "searchMode": "bm25",
  "vectorWeight": 0,
  "bm25Weight": 100
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

### Health Check

#### Check Server Status
```http
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-11-07T10:30:00Z",
  "services": {
    "mongodb": "connected",
    "vectorStore": "ready",
    "llm": "available"
  }
}
```

## Configuration

### Search Algorithm Configuration

The application supports three search modes with configurable weights:

```typescript
// Search modes available
type SearchMode = "vector" | "bm25" | "hybrid";

// Example hybrid search configuration
const hybridConfig = {
  searchMode: "hybrid",
  vectorWeight: 70,    // 70% semantic similarity
  bm25Weight: 30       // 30% keyword matching
};
```

### Vector Database Setup

MongoDB Atlas vector search index configuration:

```javascript
{
  "name": "user_stories_vector_index",
  "type": "vectorSearch",
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

### Text Search Index (for BM25)

MongoDB text search index for keyword-based search:

```javascript
{
  "name": "text_search_index",
  "key": {
    "text": "text",
    "metadata.title": "text",
    "metadata.description": "text", 
    "metadata.fullContent": "text"
  },
  "weights": {
    "metadata.title": 10,
    "metadata.description": 5,
    "metadata.fullContent": 1,
    "text": 1
  }
}
```

## Troubleshooting

### Common Issues

#### User Stories Not Processing
- **Check file format**: Ensure files are CSV or TXT with proper user story columns
- **File size limits**: Large files may require batch processing
- **Vector index**: Verify MongoDB Atlas vector search index exists

#### Search Not Returning Results
- **Index status**: Ensure both vector and text search indexes are created
- **Query specificity**: Try different query variations
- **Search mode**: Switch between vector, BM25, and hybrid to test different approaches

#### API Errors
- **Authentication**: Verify Mistral and Testleaf API keys in environment
- **Rate limits**: Check if you've exceeded API rate limits
- **Database connection**: Ensure MongoDB Atlas is accessible

### Debug Mode

Enable debug logging:

```bash
export ENABLE_DETAILED_LOGS=true
npm run dev
```

### Performance Optimization

- **Batch size**: Optimize ingestion batch size in `.env` (`INGESTION_BATCH_SIZE`)
- **Search weights**: Fine-tune vector/BM25 balance for your use case
- **LLM re-ranking**: Enable/disable in `.env` (`LLM_RERANKING_ENABLED`)

## Development

### Project Structure

```
qa-bot-langchain/
├── src/
│   ├── config/              # Configuration management
│   ├── lib/
│   │   ├── embeddings/      # Embedding providers (Mistral, OpenAI)
│   │   ├── models/          # LLM configurations
│   │   └── vectorstore/     # MongoDB vector store with hybrid search
│   ├── services/            # Business logic
│   │   └── userStoryRetrievalService.ts  # Main retrieval service
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions and logging
│   └── server.ts            # Express server with CORS
├── client/                  # Frontend web interface
│   ├── index.html          # Modern UI with hybrid search controls
│   ├── styles.css          # Light blue theme styling
│   └── script.js           # Frontend logic with slider controls
├── user_stories/           # Directory for user story files
└── docs/                   # This documentation
```

### Key Components

#### Hybrid Search Implementation
- **Vector Search**: Uses Mistral embeddings (1024 dimensions)
- **BM25 Search**: MongoDB text search with weighted fields
- **Score Combination**: Weighted average of both search methods
- **Auto Mode Switching**: UI automatically switches modes based on slider position

#### User Story Processing Pipeline
1. **File Upload & Validation**
2. **CSV Parsing & Extraction** 
3. **Vector Embedding Generation**
4. **MongoDB Storage with Indexes**
5. **Hybrid Search Capability**
6. **LLM Standardization & Quality Scoring**

### Testing

```bash
# Build and verify
npm run build

# Start application
npm run start:app

# Test with sample user story
# Navigate to http://localhost:8080
# Try: "As a nurse, I want to manage patient registration"
```

## Support

### Getting Help

- **GitHub Issues**: Report bugs and feature requests for this specific implementation
- **Documentation**: This documentation covers the actual codebase features
- **Logs**: Enable detailed logging for troubleshooting

### Version History

- **v0.1.0**: Basic user story ingestion and vector search
- **v0.2.0**: Added LLM standardization and quality scoring  
- **v0.3.0**: Implemented hybrid search with BM25 + Vector
- **v0.4.0**: Enhanced UI with real-time search controls and light blue theme

---

## License

This project is intended for internal use.

## Acknowledgments

- **LangChain**: For MongoDB vector store integration
- **Mistral AI**: For high-quality embeddings (1024 dimensions)
- **MongoDB Atlas**: For vector and text search capabilities
- **Testleaf**: For GPT-4o-mini access
