# AI Proxy Service

A proxy service built with NestJS and TypeScript that forwards user prompts to AWS Bedrock AI models and returns intelligent responses.

## Features

- **Built with NestJS** - Enterprise-ready Node.js framework with TypeScript
- **AWS Bedrock Integration** - Support for multiple AI models (Claude, Titan, etc.)
- **Model Discovery** - GET endpoint to retrieve all available LLM providers and models with pricing
- **Input Validation** - Comprehensive request validation with class-validator
- **Security** - CORS enabled, input sanitization, error handling
- **Comprehensive Logging** - Structured logging with configurable levels
- **API Documentation** - Interactive Swagger/OpenAPI documentation
- **Environment Configuration** - Flexible configuration management
- **Health Checks** - Built-in health monitoring endpoints
- **Testing Ready** - Jest setup for unit and e2e tests

## Repository Structure

```
src/
├── main.ts                     # Application entry point
├── app.module.ts              # Root module
├── common/                    # Shared services
│   ├── logger.service.ts      # Custom logging service
│   └── logging.interceptor.ts # HTTP request/response logging
└── proxy/
    ├── proxy.module.ts        # Proxy feature module
    ├── proxy.controller.ts    # REST API endpoints
    ├── dto/                   # Data transfer objects
    │   ├── prompt-request.dto.ts  # Request validation
    │   └── prompt-response.dto.ts # Response interface
    └── services/
        └── bedrock.service.ts # AWS Bedrock integration
```

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- AWS Account with Bedrock access
- AWS credentials configured

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/demo-ai-proxy-service.git
cd demo-ai-proxy-service
```


2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

4. **Configure your AWS credentials in `.env`**
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_SESSION_TOKEN=your-session-token-if-using-temporary-credentials

# Application Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=INFO

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_MAX_TOKENS=1000
BEDROCK_TEMPERATURE=0.7
```

### Running the Application

**Development Mode** (with hot reload)
```bash
npm run start:dev
```

**Production Mode**
```bash
npm run build
npm run start:prod
```

The service will be available at:
- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **API Endpoints**: http://localhost:3000/api/proxy

## API Documentation



### Interactive Documentation

Visit http://localhost:3000/api/docs for the complete Swagger/OpenAPI documentation where you can:
- View all available endpoints
- See request/response schemas
- Test endpoints directly in the browser
- View example requests and responses

### API Endpoints

#### Get All LLM Providers and Models

```http
GET /api/proxy/providers
```

**Response:**
```json
{
  "providers": [
    {
      "name": "Anthropic",
      "description": "Claude family of large language models",
      "website": "https://www.anthropic.com",
      "models": [
        {
          "id": "anthropic.claude-3-5-sonnet-20240620-v1:0",
          "name": "Claude 3.5 Sonnet",
          "description": "Most intelligent model with balanced performance for complex tasks",
          "maxTokens": 200000,
          "supportsStreaming": true,
          "inputCostPer1K": 0.003,
          "outputCostPer1K": 0.015
        }
      ]
    }
  ],
  "totalModels": 21,
  "defaultModel": "anthropic.claude-3-sonnet-20240229-v1:0",
  "timestamp": "2025-09-12T20:09:18.273Z"
}
```

#### Send Prompt to AI Model

```http
POST /api/proxy/prompt
Content-Type: application/json

{
  "prompt": "What is artificial intelligence?",
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "maxTokens": 1000,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "response": "Artificial intelligence (AI) refers to...",
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "usage": {
    "inputTokens": 15,
    "outputTokens": 128
  }
}
```

#### Health Check

```http
GET /api/proxy/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-12T18:33:48.905Z",
  "endpoints": [
    "GET /api/proxy/health - This endpoint",
    "POST /api/proxy/health - Health check",
    "POST /api/proxy/prompt - Send prompt to Bedrock"
  ]
}
```

#### API Information

```http
GET /api/proxy
```

## Supported Models



The service supports various AWS Bedrock models:
- **Anthropic Claude** models (claude-3-sonnet, claude-3-haiku, etc.)
- **Amazon Titan** models
- Other Bedrock-compatible models

The service automatically handles different request/response formats for each model family.

## Logging

### Logging Features

The application includes enterprise-grade logging with:

- **Configurable log levels**: ERROR, WARN, INFO, DEBUG, VERBOSE
- **Environment-based configuration** via `LOG_LEVEL` env variable
- **Structured logging** with timestamps and context
- **HTTP Request/Response logging** with performance metrics
- **AI Service logging** with model invocation tracking
- **Security features** with sensitive data redaction
- **Request ID tracking** for debugging

### Log Levels Configuration

Set the `LOG_LEVEL` environment variable to control verbosity:

```env
LOG_LEVEL=ERROR    # Only errors
LOG_LEVEL=WARN     # Errors and warnings
LOG_LEVEL=INFO     # Standard production logging (recommended)
LOG_LEVEL=DEBUG    # Development debugging
LOG_LEVEL=VERBOSE  # Maximum verbosity
```

### Log Format Examples

**Application Startup**
```
2025-09-12T18:33:48.905Z [INFO]  Application started successfully!
2025-09-12T18:33:48.905Z [INFO]  Server running on: http://localhost:3000
2025-09-12T18:33:48.906Z [INFO]  AWS Region: us-east-1
2025-09-12T18:33:48.906Z [INFO]  Default Model: anthropic.claude-3-sonnet-20240229-v1:0
```

**HTTP Request Logging**
```
2025-09-12T18:34:15.123Z [INFO] [LoggingInterceptor] Incoming POST /api/proxy/prompt - IP: 127.0.0.1
2025-09-12T18:34:16.789Z [INFO] [LoggingInterceptor] POST /api/proxy/prompt 201 - 1665ms
```

**AI Service Logging**
```
2025-09-12T18:34:15.130Z [INFO] [BedrockService] Invoking model: anthropic.claude-3-sonnet-20240229-v1:0
2025-09-12T18:34:16.785Z [INFO] [BedrockService] Received response from Bedrock in 1654ms
```

## Development

### Available Scripts

```bash
# Development
npm run start:dev    # Start with hot reload
npm run start:debug  # Start in debug mode

# Production
npm run build        # Build the application
npm run start:prod   # Start production build

# Code Quality
npm run format       # Format code with Prettier
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:cov     # Run tests with coverage
npm run test:e2e     # Run end-to-end tests
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region for Bedrock | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | Required |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required |
| `AWS_SESSION_TOKEN` | AWS session token (for temporary credentials) | Optional |
| `BEDROCK_MODEL_ID` | Default Bedrock model ID | `anthropic.claude-3-sonnet-20240229-v1:0` |
| `BEDROCK_MAX_TOKENS` | Default max tokens | `1000` |
| `BEDROCK_TEMPERATURE` | Default temperature | `0.7` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Error Handling

The application includes comprehensive error handling:
- Input validation errors (400 Bad Request)
- AWS service errors (500 Internal Server Error)
- Detailed error logging with stack traces
- Structured error responses with request IDs

## Security Considerations

- Environment variables for sensitive data
- Input validation and sanitization
- CORS enabled for cross-origin requests
- Sensitive data redaction in logs
- Request ID tracking for security auditing

## Monitoring and Production

### Performance Tracking
- Response times for all endpoints
- AI model performance monitoring
- Token usage tracking for cost optimization

### Error Detection
- Real-time error alerts with stack traces
- Request tracing with unique IDs
- Detailed context for debugging

### Production Recommendations

**Log Level Settings**
- Development: `DEBUG` or `VERBOSE`
- Staging: `INFO`
- Production: `INFO` or `WARN`

**Log Aggregation**

Consider integrating with:
- AWS CloudWatch for AWS-hosted applications
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk for enterprise log management
- DataDog for application performance monitoring

## Testing

### Unit Tests
```bash
npm run test
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Manual Testing

```bash
# Health check
curl -X GET http://localhost:3000/api/proxy/health

# Get all available providers and models
curl -X GET http://localhost:3000/api/proxy/providers

# Send a prompt
curl -X POST http://localhost:3000/api/proxy/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```