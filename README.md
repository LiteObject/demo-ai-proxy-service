# AI Proxy Service# AI Proxy Service



A professional proxy service built with NestJS and TypeScript that forwards user prompts to AWS Bedrock AI models and returns intelligent responses.A professional proxy service built with NestJS and TypeScript that forwards user prompts to AWS Bedrock AI models and returns intelligent responses.



## Features## Features



- **Built with NestJS** - Enterprise-ready Node.js framework with TypeScript- **Built with NestJS** - Enterprise-ready Node.js framework with TypeScript

- **AWS Bedrock Integration** - Support for multiple AI models (Claude, Titan, etc.)- **AWS Bedrock Integration** - Support for multiple AI models (Claude, Titan, etc.)

- **Input Validation** - Comprehensive request validation with class-validator- **Input Validation** - Comprehensive request validation with class-validator

- **Security** - CORS enabled, input sanitization, error handling- **Security** - CORS enabled, input sanitization, error handling

- **Comprehensive Logging** - Structured logging with configurable levels- **Comprehensive Logging** - Structured logging with configurable levels

- **API Documentation** - Interactive Swagger/OpenAPI documentation- **API Documentation** - Interactive Swagger/OpenAPI documentation

- **Environment Configuration** - Flexible configuration management- **Environment Configuration** - Flexible configuration management

- **Health Checks** - Built-in health monitoring endpoints- **Health Checks** - Built-in health monitoring endpoints

- **Testing Ready** - Jest setup for unit and e2e tests- **Testing Ready** - Jest setup for unit and e2e tests



## Architecture## Architecture



``````

src/src/

├── main.ts                     # Application entry point├── main.ts                     # Application entry point

├── app.module.ts              # Root module├── app.module.ts              # Root module

├── common/                    # Shared services├── common/                    # Shared services

│   ├── logger.service.ts      # Custom logging service│   ├── logger.service.ts      # Custom logging service

│   └── logging.interceptor.ts # HTTP request/response logging│   └── logging.interceptor.ts # HTTP request/response logging

└── proxy/└── proxy/

    ├── proxy.module.ts        # Proxy feature module    ├── proxy.module.ts        # Proxy feature module

    ├── proxy.controller.ts    # REST API endpoints    ├── proxy.controller.ts    # REST API endpoints

    ├── dto/                   # Data transfer objects    ├── dto/                   # Data transfer objects

    │   ├── prompt-request.dto.ts  # Request validation    │   ├── prompt-request.dto.ts  # Request validation

    │   └── prompt-response.dto.ts # Response interface    │   └── prompt-response.dto.ts # Response interface

    └── services/    └── services/

        └── bedrock.service.ts # AWS Bedrock integration        └── bedrock.service.ts # AWS Bedrock integration

``````



## Quick Start## Quick Start



### Prerequisites### Prerequisites



- Node.js (v18 or higher)- Node.js (v18 or higher)

- npm or yarn- npm or yarn

- AWS Account with Bedrock access- AWS Account with Bedrock access

- AWS credentials configured- AWS credentials configured



### Installation### Installation



1. **Clone the repository**1. **Clone the repository**

```bash```bash

git clone https://github.com/your-username/demo-ai-proxy-service.gitgit clone https://github.com/your-username/demo-ai-proxy-service.git

cd demo-ai-proxy-servicecd demo-ai-proxy-service

``````



2. **Install dependencies**2. **Install dependencies**

```bash```bash

npm installnpm install

``````



3. **Set up environment variables**3. **Set up environment variables**

```bash```bash

cp .env.example .envcp .env.example .env

``````



4. **Configure your AWS credentials in `.env`**4. **Configure your AWS credentials in `.env`**

```env```env

# AWS Configuration# AWS Configuration

AWS_REGION=us-east-1AWS_REGION=us-east-1

AWS_ACCESS_KEY_ID=your-access-key-idAWS_ACCESS_KEY_ID=your-access-key-id

AWS_SECRET_ACCESS_KEY=your-secret-access-keyAWS_SECRET_ACCESS_KEY=your-secret-access-key

AWS_SESSION_TOKEN=your-session-token-if-using-temporary-credentialsAWS_SESSION_TOKEN=your-session-token-if-using-temporary-credentials



# Application Configuration# Application Configuration

PORT=3000PORT=3000

NODE_ENV=developmentNODE_ENV=development

LOG_LEVEL=INFOLOG_LEVEL=INFO



# Bedrock Configuration# Bedrock Configuration

BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

BEDROCK_MAX_TOKENS=1000BEDROCK_MAX_TOKENS=1000

BEDROCK_TEMPERATURE=0.7BEDROCK_TEMPERATURE=0.7

``````



### Running the Application### Running the Application



**Development Mode** (with hot reload)**Development Mode** (with hot reload)

```bash```bash

npm run start:devnpm run start:dev

``````



**Production Mode****Production Mode**

```bash```bash

npm run buildnpm run build

npm run start:prodnpm run start:prod

``````



The service will be available at:The service will be available at:

- **Application**: http://localhost:3000- **Application**: http://localhost:3000

- **API Documentation**: http://localhost:3000/api/docs- **API Documentation**: http://localhost:3000/api/docs

- **API Endpoints**: http://localhost:3000/api/proxy- **API Endpoints**: http://localhost:3000/api/proxy



## API Documentation## API Documentation



### Interactive Documentation### Interactive Documentation



Visit http://localhost:3000/api/docs for the complete Swagger/OpenAPI documentation where you can:Visit http://localhost:3000/api/docs for the complete Swagger/OpenAPI documentation where you can:

- View all available endpoints- View all available endpoints

- See request/response schemas- See request/response schemas

- Test endpoints directly in the browser- Test endpoints directly in the browser

- View example requests and responses- View example requests and responses



### API Endpoints### API Endpoints



#### Send Prompt to AI Model#### Send Prompt to AI Model

```http```http

POST /api/proxy/promptPOST /api/proxy/prompt

Content-Type: application/jsonContent-Type: application/json



{{

  "prompt": "What is artificial intelligence?",  "prompt": "What is artificial intelligence?",

  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",

  "maxTokens": 1000,  "maxTokens": 1000,

  "temperature": 0.7  "temperature": 0.7

}}

``````



**Response:****Response:**

```json```json

{{

  "response": "Artificial intelligence (AI) refers to...",  "response": "Artificial intelligence (AI) refers to...",

  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",

  "usage": {  "usage": {

    "inputTokens": 15,    "inputTokens": 15,

    "outputTokens": 128    "outputTokens": 128

  }  }

}}

``````



#### Health Check#### Health Check

```http```http

GET /api/proxy/healthGET /api/proxy/health

``````



**Response:****Response:**

```json```json

{{

  "status": "ok",  "status": "ok",

  "timestamp": "2025-09-12T18:33:48.905Z",  "timestamp": "2025-09-12T18:33:48.905Z",

  "endpoints": [  "endpoints": [

    "GET /api/proxy/health - This endpoint",    "GET /api/proxy/health - This endpoint",

    "POST /api/proxy/health - Health check",    "POST /api/proxy/health - Health check",

    "POST /api/proxy/prompt - Send prompt to Bedrock"    "POST /api/proxy/prompt - Send prompt to Bedrock"

  ]  ]

}}

``````



#### API Information#### API Information

```http```http

GET /api/proxyGET /api/proxy

``````



## Supported Models## Supported Models



The service supports various AWS Bedrock models:The service supports various AWS Bedrock models:

- **Anthropic Claude** models (claude-3-sonnet, claude-3-haiku, etc.)- **Anthropic Claude** models (claude-3-sonnet, claude-3-haiku, etc.)

- **Amazon Titan** models- **Amazon Titan** models

- Other Bedrock-compatible models- Other Bedrock-compatible models



The service automatically handles different request/response formats for each model family.The service automatically handles different request/response formats for each model family.



## Logging## Logging



### Logging Features### Logging Features



The application includes enterprise-grade logging with:The application includes enterprise-grade logging with:



- **Configurable log levels**: ERROR, WARN, INFO, DEBUG, VERBOSE- **Configurable log levels**: ERROR, WARN, INFO, DEBUG, VERBOSE

- **Environment-based configuration** via `LOG_LEVEL` env variable- **Environment-based configuration** via `LOG_LEVEL` env variable

- **Structured logging** with timestamps and context- **Structured logging** with timestamps and context

- **HTTP Request/Response logging** with performance metrics- **HTTP Request/Response logging** with performance metrics

- **AI Service logging** with model invocation tracking- **AI Service logging** with model invocation tracking

- **Security features** with sensitive data redaction- **Security features** with sensitive data redaction

- **Request ID tracking** for debugging- **Request ID tracking** for debugging



### Log Levels Configuration### Log Levels Configuration



Set the `LOG_LEVEL` environment variable to control verbosity:Set the `LOG_LEVEL` environment variable to control verbosity:



```env```env

LOG_LEVEL=ERROR    # Only errorsLOG_LEVEL=ERROR    # Only errors

LOG_LEVEL=WARN     # Errors and warningsLOG_LEVEL=WARN     # Errors and warnings

LOG_LEVEL=INFO     # Standard production logging (recommended)LOG_LEVEL=INFO     # Standard production logging (recommended)

LOG_LEVEL=DEBUG    # Development debuggingLOG_LEVEL=DEBUG    # Development debugging

LOG_LEVEL=VERBOSE  # Maximum verbosityLOG_LEVEL=VERBOSE  # Maximum verbosity

``````



### Log Format Examples### Log Format Examples



**Application Startup****Application Startup**

``````

2025-09-12T18:33:48.905Z [INFO]  Application started successfully!2025-09-12T18:33:48.905Z [INFO]  Application started successfully!

2025-09-12T18:33:48.905Z [INFO]  Server running on: http://localhost:30002025-09-12T18:33:48.905Z [INFO]  Server running on: http://localhost:3000

2025-09-12T18:33:48.906Z [INFO]  AWS Region: us-east-12025-09-12T18:33:48.906Z [INFO]  AWS Region: us-east-1

2025-09-12T18:33:48.906Z [INFO]  Default Model: anthropic.claude-3-sonnet-20240229-v1:02025-09-12T18:33:48.906Z [INFO]  Default Model: anthropic.claude-3-sonnet-20240229-v1:0

``````



**HTTP Request Logging****HTTP Request Logging**

``````

2025-09-12T18:34:15.123Z [INFO] [LoggingInterceptor] Incoming POST /api/proxy/prompt - IP: 127.0.0.12025-09-12T18:34:15.123Z [INFO] [LoggingInterceptor] Incoming POST /api/proxy/prompt - IP: 127.0.0.1

2025-09-12T18:34:16.789Z [INFO] [LoggingInterceptor] POST /api/proxy/prompt 201 - 1665ms2025-09-12T18:34:16.789Z [INFO] [LoggingInterceptor] POST /api/proxy/prompt 201 - 1665ms

``````



**AI Service Logging****AI Service Logging**

``````

2025-09-12T18:34:15.130Z [INFO] [BedrockService] Invoking model: anthropic.claude-3-sonnet-20240229-v1:02025-09-12T18:34:15.130Z [INFO] [BedrockService] Invoking model: anthropic.claude-3-sonnet-20240229-v1:0

2025-09-12T18:34:16.785Z [INFO] [BedrockService] Received response from Bedrock in 1654ms2025-09-12T18:34:16.785Z [INFO] [BedrockService] Received response from Bedrock in 1654ms

``````



## Development## Development



### Available Scripts### Available Scripts



```bash```bash

# Development# Development

npm run start:dev    # Start with hot reloadnpm run start:dev    # Start with hot reload

npm run start:debug  # Start in debug modenpm run start:debug  # Start in debug mode



# Production# Production

npm run build        # Build the applicationnpm run build        # Build the application

npm run start:prod   # Start production buildnpm run start:prod   # Start production build



# Code Quality# Code Quality

npm run format       # Format code with Prettiernpm run format       # Format code with Prettier

npm run lint         # Run ESLintnpm run lint         # Run ESLint

npm run lint:fix     # Fix ESLint issuesnpm run lint:fix     # Fix ESLint issues



# Testing# Testing

npm run test         # Run unit testsnpm run test         # Run unit tests

npm run test:watch   # Run tests in watch modenpm run test:watch   # Run tests in watch mode

npm run test:cov     # Run tests with coveragenpm run test:cov     # Run tests with coverage

npm run test:e2e     # Run end-to-end testsnpm run test:e2e     # Run end-to-end tests

``````



### Environment Variables### Environment Variables



| Variable | Description | Default || Variable | Description | Default |

|----------|-------------|---------||----------|-------------|---------|

| `AWS_REGION` | AWS region for Bedrock | `us-east-1` || `AWS_REGION` | AWS region for Bedrock | `us-east-1` |

| `AWS_ACCESS_KEY_ID` | AWS access key | Required || `AWS_ACCESS_KEY_ID` | AWS access key | Required |

| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required || `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required |

| `AWS_SESSION_TOKEN` | AWS session token (for temporary credentials) | Optional || `AWS_SESSION_TOKEN` | AWS session token (for temporary credentials) | Optional |

| `BEDROCK_MODEL_ID` | Default Bedrock model ID | `anthropic.claude-3-sonnet-20240229-v1:0` || `BEDROCK_MODEL_ID` | Default Bedrock model ID | `anthropic.claude-3-sonnet-20240229-v1:0` |

| `BEDROCK_MAX_TOKENS` | Default max tokens | `1000` || `BEDROCK_MAX_TOKENS` | Default max tokens | `1000` |

| `BEDROCK_TEMPERATURE` | Default temperature | `0.7` || `BEDROCK_TEMPERATURE` | Default temperature | `0.7` |

| `PORT` | Server port | `3000` || `PORT` | Server port | `3000` |

| `NODE_ENV` | Environment | `development` || `NODE_ENV` | Environment | `development` |

| `LOG_LEVEL` | Logging level | `INFO` || `LOG_LEVEL` | Logging level | `INFO` |



## Error Handling## Error Handling



The application includes comprehensive error handling:The application includes comprehensive error handling:

- Input validation errors (400 Bad Request)- Input validation errors (400 Bad Request)

- AWS service errors (500 Internal Server Error)- AWS service errors (500 Internal Server Error)

- Detailed error logging with stack traces- Detailed error logging with stack traces

- Structured error responses with request IDs- Structured error responses with request IDs



## Security Considerations## Security Considerations



- Environment variables for sensitive data- Environment variables for sensitive data

- Input validation and sanitization- Input validation and sanitization

- CORS enabled for cross-origin requests- CORS enabled for cross-origin requests

- Sensitive data redaction in logs- Sensitive data redaction in logs

- Request ID tracking for security auditing- Request ID tracking for security auditing



## Monitoring and Production## Monitoring and Production



### Performance Tracking### Performance Tracking

- Response times for all endpoints- Response times for all endpoints

- AI model performance monitoring- AI model performance monitoring

- Token usage tracking for cost optimization- Token usage tracking for cost optimization



### Error Detection### Error Detection

- Real-time error alerts with stack traces- Real-time error alerts with stack traces

- Request tracing with unique IDs- Request tracing with unique IDs

- Detailed context for debugging- Detailed context for debugging



### Production Recommendations### Production Recommendations



**Log Level Settings****Log Level Settings**

- Development: `DEBUG` or `VERBOSE`- Development: `DEBUG` or `VERBOSE`

- Staging: `INFO`- Staging: `INFO`

- Production: `INFO` or `WARN`- Production: `INFO` or `WARN`



**Log Aggregation****Log Aggregation**

Consider integrating with:Consider integrating with:

- AWS CloudWatch for AWS-hosted applications- AWS CloudWatch for AWS-hosted applications

- ELK Stack (Elasticsearch, Logstash, Kibana)- ELK Stack (Elasticsearch, Logstash, Kibana)

- Splunk for enterprise log management- Splunk for enterprise log management

- DataDog for application performance monitoring- DataDog for application performance monitoring



## Testing## Testing



### Unit Tests### Unit Tests

```bash```bash

npm run testnpm run test

``````



### End-to-End Tests### End-to-End Tests

```bash```bash

npm run test:e2enpm run test:e2e

``````



### Manual Testing### Manual Testing

```bash```bash

# Health check# Health check

curl -X GET http://localhost:3000/api/proxy/healthcurl -X GET http://localhost:3000/api/proxy/health



# Send a prompt# Send a prompt

curl -X POST http://localhost:3000/api/proxy/prompt \curl -X POST http://localhost:3000/api/proxy/prompt \

  -H "Content-Type: application/json" \  -H "Content-Type: application/json" \

  -d '{"prompt": "Hello, how are you?"}'  -d '{"prompt": "Hello, how are you?"}'

``````



## Contributing## Contributing



1. Fork the repository1. Fork the repository

2. Create your feature branch (`git checkout -b feature/amazing-feature`)2. Create your feature branch (`git checkout -b feature/amazing-feature`)

3. Commit your changes (`git commit -m 'Add some amazing feature'`)3. Commit your changes (`git commit -m 'Add some amazing feature'`)

4. Push to the branch (`git push origin feature/amazing-feature`)4. Push to the branch (`git push origin feature/amazing-feature`)

5. Open a Pull Request5. Open a Pull Request



## License## License



This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



## Support## Support



For support, please open an issue in the GitHub repository or contact the development team.For support, please open an issue in the GitHub repository or contact the development team.