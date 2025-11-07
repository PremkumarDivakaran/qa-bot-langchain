# QA Bot with LangChain - Documentation

## Overview

This QA Bot is a TypeScript-based application that leverages LangChain for document processing and question-answering capabilities. It features a modern web interface with document ingestion, user story retrieval, and intelligent QA functionality.

## Features

### 🔄 Document Ingestion
- **File Upload**: Support for PDF and other document formats
- **Batch Processing**: Process multiple documents simultaneously
- **Progress Tracking**: Real-time progress indicators during ingestion
- **Error Handling**: Comprehensive error reporting and validation

### 🔍 User Story Retrieval
- **Semantic Search**: Find relevant user stories using natural language queries
- **Similarity Scoring**: AI-powered relevance scoring for search results
- **Story Generation**: Generate new user stories based on existing patterns
- **Quality Assessment**: Automated scoring of user story quality

### 💬 QA Bot
- **Interactive Chat**: Ask questions about ingested documents
- **Context-Aware**: Maintains conversation context for follow-up questions
- **Source Citations**: References to source documents in responses
- **Multiple AI Models**: Support for various LLM providers

## Getting Started

### Prerequisites
- Node.js 18.17 or higher
- Python 3.x
- MongoDB (for vector storage)

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
   # AI Model Configuration
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GROQ_API_KEY=your_groq_api_key
   
   # Database Configuration
   MONGODB_URI=your_mongodb_connection_string
   
   # Application Settings
   PORT=8000
   NODE_ENV=development
   ```

### Running the Application

#### Start Both Frontend and Backend
```bash
npm run app
```

#### Start Services Individually
```bash
# Backend API Server (port 8000)
npm run backend

# Frontend UI Server (port 3000)
npm run frontend
```

#### Development Mode
```bash
# Backend with hot reload
npm run dev
```

## Usage Guide

### Document Ingestion

1. **Navigate to the Ingestion Tab**
   - Click on the "Document Ingestion" tab in the main interface

2. **Upload Documents**
   - Drag and drop files into the upload zone, or
   - Click "Browse files" to select documents
   - Supported formats: PDF, DOCX, TXT

3. **Configure Processing Options**
   - **Split Documents**: Break large documents into chunks
   - **Generate Embeddings**: Create vector embeddings for semantic search
   - **Store Metadata**: Extract and store document metadata

4. **Monitor Progress**
   - Real-time progress bar shows processing status
   - Detailed logs display processing steps
   - Error notifications for failed uploads

### User Story Retrieval

1. **Access the Retrieval Tab**
   - Switch to the "User Story Retrieval" tab

2. **Enter Your Query**
   - Describe the user story or feature you're looking for
   - Use natural language (e.g., "user authentication with social media")

3. **Configure Search Parameters**
   - **Result Limit**: Number of stories to retrieve (1-20)
   - **Similarity Threshold**: Minimum relevance score

4. **Review Results**
   - **Generated Story**: AI-created user story based on your query
   - **Quality Score**: Automated assessment of story quality
   - **Relevant Stories**: Existing stories ranked by similarity

### QA Bot Interaction

1. **Open the QA Bot Tab**
   - Navigate to the "QA Bot" section

2. **Ask Questions**
   - Type questions about your ingested documents
   - Use follow-up questions to dive deeper
   - Examples:
     - "What are the main features of the authentication system?"
     - "How does the payment processing work?"
     - "What security measures are implemented?"

3. **Interpret Responses**
   - Answers include source document references
   - Confidence scores indicate response reliability
   - Related topics suggest additional questions

## API Reference

### Document Ingestion Endpoints

#### Upload Documents
```http
POST /api/upload
Content-Type: multipart/form-data

Parameters:
- files: Document files (PDF, DOCX, TXT)
- options: Processing configuration
```

#### Get Ingestion Status
```http
GET /api/ingestion/status/:jobId

Response:
{
  "status": "processing|completed|failed",
  "progress": 75,
  "documentsProcessed": 3,
  "totalDocuments": 4,
  "errors": []
}
```

### User Story Endpoints

#### Search User Stories
```http
POST /api/user-stories/search

Body:
{
  "query": "user login functionality",
  "limit": 10,
  "threshold": 0.7
}

Response:
{
  "generatedStory": { ... },
  "relevantStories": [ ... ],
  "totalFound": 15
}
```

#### Create User Story Index
```http
POST /api/user-stories/index

Body:
{
  "documents": ["doc1.pdf", "doc2.docx"],
  "settings": { ... }
}
```

### QA Bot Endpoints

#### Ask Question
```http
POST /api/qa/ask

Body:
{
  "question": "How does user authentication work?",
  "sessionId": "session-123",
  "context": { ... }
}

Response:
{
  "answer": "User authentication is implemented using...",
  "sources": [
    {
      "document": "auth-spec.pdf",
      "page": 5,
      "confidence": 0.95
    }
  ],
  "followUpSuggestions": [ ... ]
}
```

## Configuration

### Model Configuration

The application supports multiple AI providers. Configure in your environment:

```typescript
// Model priorities (fallback order)
const modelConfig = {
  primary: "openai",      // GPT-4, GPT-3.5-turbo
  secondary: "anthropic", // Claude-3, Claude-2
  fallback: "groq"       // Llama, Mixtral
};
```

### Vector Database Setup

MongoDB vector search configuration:

```javascript
{
  "vectorSearchIndex": {
    "type": "vectorSearch",
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1536,
        "similarity": "cosine"
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

#### Documents Not Processing
- **Check file format**: Ensure files are in supported formats (PDF, DOCX, TXT)
- **File size limits**: Large files (>10MB) may timeout
- **Network connectivity**: Verify internet connection for AI model access

#### Search Not Returning Results
- **Index status**: Ensure vector index is created and populated
- **Query specificity**: Try more specific or different query terms
- **Threshold settings**: Lower similarity threshold for broader results

#### API Errors
- **Authentication**: Verify AI provider API keys in environment
- **Rate limits**: Check if you've exceeded API rate limits
- **Database connection**: Ensure MongoDB is running and accessible

### Debug Mode

Enable debug logging:

```bash
export NODE_ENV=development
export DEBUG=qa-bot:*
npm run dev
```

### Performance Optimization

- **Chunk size**: Optimize document chunking for your use case
- **Batch processing**: Process documents in smaller batches
- **Caching**: Enable response caching for frequently asked questions

## Development

### Project Structure

```
qa-bot-langchain/
├── src/                  # TypeScript source code
│   ├── chain.ts         # LangChain configuration
│   ├── loaders.ts       # Document loaders
│   ├── model.ts         # AI model configurations
│   ├── server.ts        # Express server
│   └── pipelines/       # Processing pipelines
├── client/              # Frontend assets
│   ├── index.html       # Main UI
│   ├── styles.css       # Modern styling
│   └── script.js        # Frontend JavaScript
├── docs/                # Documentation
├── scripts/             # Utility scripts
└── package.json         # Dependencies and scripts
```

### Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   ```
5. **Submit a pull request**

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Support

### Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check this documentation for common questions
- **Community**: Join our Discord/Slack for community support

### Version History

- **v0.1.0**: Initial release with basic QA functionality
- **v0.2.0**: Added user story retrieval features
- **v0.3.0**: Enhanced UI with modern design
- **v0.4.0**: Multi-model support and improved error handling

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **LangChain**: For the powerful AI orchestration framework
- **OpenAI**: For GPT model access
- **Anthropic**: For Claude model integration
- **MongoDB**: For vector database capabilities
