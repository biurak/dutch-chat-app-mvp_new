# Ordering at a Café - Prompt System Documentation

## Overview

This document provides an extensive explanation of how the "Ordering at a Café" scenario works in the Dutch Chat Application, including the complete prompt flow, response handling, and system architecture with detailed Mermaid diagrams.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Prompt Configuration](#prompt-configuration)
3. [Message Flow Sequence](#message-flow-sequence)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Response Processing](#response-processing)
6. [Error Handling](#error-handling)
7. [User Experience Flow](#user-experience-flow)
8. [Implementation Details](#implementation-details)

---

## System Architecture

The café ordering system follows a multi-layered architecture that separates concerns between the frontend React components, API layer, and AI service.

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Chat Interface]
        CIC[Chat Input Component]
        CM[Chat Messages Display]
        API_HOOK[useChatApi Hook]
        MSG_HOOK[useChatMessages Hook]
    end
    
    subgraph "API Layer"
        ROUTE["/api/chat/ordering-cafe"]
        VALIDATOR[Request Validator]
        PROMPT_LOADER[Prompt Loader]
    end
    
    subgraph "AI Service Layer"
        OPENAI[OpenAI Service]
        PROMPT_ENGINE[Prompt Engine]
        RESPONSE_PARSER[Response Parser]
    end
    
    subgraph "Configuration"
        YAML[ordering-cafe.yaml]
        TOPICS[topics.ts]
    end
    
    UI --> CIC
    CIC --> API_HOOK
    API_HOOK --> ROUTE
    ROUTE --> VALIDATOR
    VALIDATOR --> PROMPT_LOADER
    PROMPT_LOADER --> YAML
    PROMPT_LOADER --> OPENAI
    OPENAI --> PROMPT_ENGINE
    PROMPT_ENGINE --> RESPONSE_PARSER
    RESPONSE_PARSER --> API_HOOK
    API_HOOK --> MSG_HOOK
    MSG_HOOK --> CM
    CM --> UI
    
    TOPICS --> UI
    
    style UI fill:#1976d2
    style ROUTE fill:#7b1fa2
    style OPENAI fill:#388e3c
    style YAML fill:#f57c00
```

---

## Prompt Configuration

The café ordering scenario is configured through a comprehensive YAML file that defines the AI's behavior, correction rules, and response format.

### YAML Structure Breakdown

```mermaid
graph LR
    subgraph "ordering-cafe.yaml"
        META[Metadata]
        VARS[Input Variables]
        SAMPLES[Sample Inputs]
        TEMPLATE[Prompt Template]
        FORMAT[Response Format]
    end
    
    subgraph "Metadata"
        NAME["name: ordering_cafe"]
        DESC["description: AI chatbot simulating..."]
    end
    
    subgraph "Input Variables"
        CHAT_HIST["chat_history"]
        USER_INPUT["latest_user_input"]
    end
    
    subgraph "Prompt Template Sections"
        ROLE["ROLE & CONTEXT"]
        RULES["CONVERSATION RULES"]
        SUGGESTIONS["SAMPLE RESPONSE SUGGESTIONS"]
        CORRECTIONS["CORRECTION RULES"]
        TRANSLATION["TRANSLATION"]
        CONTEXT["CHAT CONTEXT"]
    end
    
    META --> NAME
    META --> DESC
    VARS --> CHAT_HIST
    VARS --> USER_INPUT
    TEMPLATE --> ROLE
    TEMPLATE --> RULES
    TEMPLATE --> SUGGESTIONS
    TEMPLATE --> CORRECTIONS
    TEMPLATE --> TRANSLATION
    TEMPLATE --> CONTEXT
    
    style META fill:#d32f2f
    style VARS fill:#388e3c
    style TEMPLATE fill:#689f38
```

### Key Configuration Elements

#### Role Definition
- **Character**: Friendly Dutch waiter
- **Setting**: In-person café service
- **Language Level**: A1-A2 Dutch
- **Response Length**: 1-2 short sentences

#### Conversation Rules
1. **Memory**: Remember previous orders
2. **Progression**: Don't repeat questions
3. **Natural Flow**: Suggest related items when appropriate
4. **Context Awareness**: Continue based on order status

#### Correction Guidelines
- **Never Correct**: Punctuation, capitalization, spacing
- **Only Correct**: Grammar/vocabulary affecting understanding
- **Examples Provided**: Specific correction scenarios

---

## Message Flow Sequence

This sequence diagram shows the complete flow from user input to AI response in the café ordering scenario.

```mermaid
sequenceDiagram
    participant User
    participant ChatInput as Chat Input Form
    participant useChatApi as useChatApi Hook
    participant API as /api/chat/ordering-cafe
    participant PromptLoader as Prompt Loader
    participant OpenAI as OpenAI Service
    participant useChatMessages as useChatMessages Hook
    participant ChatDisplay as Chat Display
    
    User->>ChatInput: Types Dutch message
    Note over User,ChatInput: "Ik wil graag een koffie"
    
    ChatInput->>useChatApi: prepareChatHistory()
    Note over useChatApi: Formats chat history<br/>Adds basic system message<br/>Includes user message
    
    useChatApi->>useChatMessages: addUserMessage()
    useChatMessages->>ChatDisplay: Display user message
    
    useChatApi->>useChatMessages: addAiStreamingMessage()
    useChatMessages->>ChatDisplay: Show "..." indicator
    
    useChatApi->>API: POST request
    Note over useChatApi,API: {<br/>  messages: [...],<br/>  topic: "ordering-cafe",<br/>  user_input: "Ik wil graag een koffie"<br/>}
    
    API->>API: Validate request
    API->>PromptLoader: loadPromptConfig("ordering-cafe")
    PromptLoader->>PromptLoader: Read ordering-cafe.yaml
    PromptLoader-->>API: Return prompt configuration
    
    API->>OpenAI: generateAIResponse()
    Note over API,OpenAI: Replaces basic system message<br/>with comprehensive YAML prompt +<br/>Conversation history +<br/>Current user input
    
    OpenAI->>OpenAI: Process with GPT-4
    Note over OpenAI: Apply comprehensive café waiter<br/>persona from YAML prompt<br/>Check grammar<br/>Generate suggestions<br/>Format JSON response
    
    OpenAI-->>API: JSON Response
    Note over OpenAI,API: {<br/>  "ai_reply": "Natuurlijk! Hoe wilt u de koffie?",<br/>  "translation": "Of course! How would you like the coffee?",<br/>  "correction": {...},<br/>  "suggestions": [...]<br/>}
    
    API-->>useChatApi: Return response
    useChatApi->>useChatMessages: updateMessage()
    Note over useChatApi,useChatMessages: Update streaming message<br/>with actual AI response
    
    useChatMessages->>ChatDisplay: Display final AI message
    ChatDisplay->>User: Show response + suggestions
    
    Note over User,ChatDisplay: User sees waiter response<br/>with 3 contextual suggestions
```

---

## Data Flow Architecture

This flowchart illustrates how data flows through the system components during a café ordering interaction.

```mermaid
flowchart TD
    Start([User Types Message]) --> Input["`**User Input**
    'Ik wil graag een koffie'`"]
    
    Input --> Validate{"`**Validate Input**
    Check length & format`"}
    
    Validate -->|Invalid| Error["`**Error Response**
    Show validation message`"]
    Validate -->|Valid| PrepareHistory["`**Prepare Chat History**
    - Add system prompt
    - Include previous messages
    - Add user input`"]
    
    PrepareHistory --> LoadPrompt["`**Load Prompt Config**
    ordering-cafe.yaml`"]
    
    LoadPrompt --> BuildPrompt["`**Build Complete Prompt**
    Template + Variables`"]
    
    BuildPrompt --> CallAI{"`**Call OpenAI API**
    GPT-4 Processing`"}
    
    CallAI -->|Success| ParseResponse["`**Parse AI Response**
    Extract JSON fields`"]
    CallAI -->|Error| Error
    
    ParseResponse --> ValidateResponse{"`**Validate Response**
    Check required fields`"}
    
    ValidateResponse -->|Invalid| DefaultResponse["`**Use Default Response**
    Fallback suggestions`"]
    ValidateResponse -->|Valid| ProcessResponse["`**Process Response**
    - AI reply in Dutch
    - English translation
    - Grammar corrections
    - 3 suggestions`"]
    
    ProcessResponse --> UpdateUI["`**Update Chat UI**
    Display waiter response`"]
    DefaultResponse --> UpdateUI
    Error --> UpdateUI
    
    UpdateUI --> ShowSuggestions["`**Show Suggestions**
    3 contextual options`"]
    
    ShowSuggestions --> WaitForUser["`**Wait for User**
    Ready for next input`"]
    
    WaitForUser --> Input
    
    style Start fill:#388e3c
    style Input fill:#1976d2
    style CallAI fill:#f57c00
    style ProcessResponse fill:#7b1fa2
    style UpdateUI fill:#0288d1
    style Error fill:#d32f2f
```

---

## Response Processing

The AI response goes through multiple processing stages to ensure consistency and quality.

### Response Structure

```mermaid
graph TB
    subgraph "AI Response JSON"
        REPLY[ai_reply]
        TRANS[translation] 
        CORR[correction]
        SUGG[suggestions]
        WORDS[new_words]
    end
    
    subgraph "Correction Object"
        CORR_TEXT[correctedDutch]
        CORR_EXP[explanation]
    end
    
    subgraph "Suggestions Array"
        SUGG1[Suggestion 1: Continue Order]
        SUGG2[Suggestion 2: Ask About Menu]
        SUGG3[Suggestion 3: Special Requests]
    end
    
    subgraph "New Words Array"
        WORD_DUTCH[dutch]
        WORD_ENG[english]
        WORD_SENT[dutch_sentence]
        WORD_SENT_ENG[english_sentence]
        CEFR[cefr_level]
    end
    
    REPLY --> UI_DISPLAY[Display to User]
    TRANS --> UI_TOGGLE[Translation Toggle]
    CORR --> CORR_TEXT
    CORR --> CORR_EXP
    CORR_TEXT --> UI_CORRECTIONS[Show Corrections]
    CORR_EXP --> UI_CORRECTIONS
    
    SUGG --> SUGG1
    SUGG --> SUGG2  
    SUGG --> SUGG3
    SUGG1 --> UI_BUTTONS[Suggestion Buttons]
    SUGG2 --> UI_BUTTONS
    SUGG3 --> UI_BUTTONS
    
    WORDS --> WORD_DUTCH
    WORDS --> WORD_ENG
    WORDS --> WORD_SENT
    WORDS --> WORD_SENT_ENG
    WORDS --> CEFR
    WORD_DUTCH --> VOCAB_REVIEW[Vocabulary Review]
    
    style UI_DISPLAY fill:#388e3c
    style UI_TOGGLE fill:#1976d2
    style UI_CORRECTIONS fill:#f57c00
    style UI_BUTTONS fill:#7b1fa2
    style VOCAB_REVIEW fill:#0288d1
```

### Suggestion Logic

The system provides exactly 3 contextual suggestions based on the conversation state:

```mermaid
flowchart TD
    AIResponse[AI Response Generated] --> CheckQuestion{"`**Check if AI asked 
    Yes/No Question?**`"}
    
    CheckQuestion -->|Yes| YesNoSuggestions["`**Generate Yes/No Suggestions**
    1. Positive response (Ja,...)
    2. Negative response (Nee,...)
    3. Clarifying question`"]
    
    CheckQuestion -->|No| ContextSuggestions["`**Generate Context Suggestions**
    Based on conversation stage`"]
    
    ContextSuggestions --> OrderStage{"`**What stage is order?**`"}
    
    OrderStage -->|Starting| StartingSuggestions["`**Starting Order**
    1. Specific drink request
    2. Ask about menu/options
    3. Ask about prices`"]
    
    OrderStage -->|In Progress| ProgressSuggestions["`**Order in Progress**
    1. Add to current order
    2. Modify current item
    3. Ask about accompaniments`"]
    
    OrderStage -->|Nearly Complete| CompleteSuggestions["`**Nearly Complete**
    1. Finalize order
    2. Ask for bill
    3. Payment method`"]
    
    YesNoSuggestions --> ValidateSuggestions["`**Validate Suggestions**
    - Exactly 3 items
    - Dutch + English
    - Contextually appropriate`"]
    
    StartingSuggestions --> ValidateSuggestions
    ProgressSuggestions --> ValidateSuggestions
    CompleteSuggestions --> ValidateSuggestions
    
    ValidateSuggestions --> DisplaySuggestions["`**Display to User**
    As clickable buttons`"]
    
    style CheckQuestion fill:#f57c00
    style YesNoSuggestions fill:#388e3c
    style ContextSuggestions fill:#1976d2
    style ValidateSuggestions fill:#7b1fa2
    style DisplaySuggestions fill:#0288d1
```

---

## Error Handling

The system includes comprehensive error handling at multiple levels:

```mermaid
flowchart TD
    UserInput[User Input] --> Validation{"`**Input Validation**`"}
    
    Validation -->|Pass| APICall[API Call]
    Validation -->|Fail| InputError["`**Input Error**
    - Too long (>1000 chars)
    - Invalid characters
    - Empty message`"]
    
    APICall --> PromptLoad{"`**Prompt Loading**`"}
    
    PromptLoad -->|Success| OpenAICall[OpenAI API Call]
    PromptLoad -->|Fail| PromptError["`**Prompt Error**
    - File not found
    - Invalid YAML
    - Missing template`"]
    
    OpenAICall --> AIResponse{"`**AI Response**`"}
    
    AIResponse -->|Success| ResponseParse[Parse Response]
    AIResponse -->|Fail| AIError["`**AI Error**
    - API quota exceeded
    - Network timeout
    - Invalid response`"]
    
    ResponseParse --> ResponseValidation{"`**Response Validation**`"}
    
    ResponseValidation -->|Valid| Success["`**Success**
    Display response`"]
    ResponseValidation -->|Invalid| ParseError["`**Parse Error**
    - Invalid JSON
    - Missing fields
    - Malformed data`"]
    
    InputError --> FallbackResponse["`**Fallback Response**
    Provide default suggestions`"]
    PromptError --> FallbackResponse
    AIError --> FallbackResponse
    ParseError --> FallbackResponse
    
    FallbackResponse --> LogError["`**Log Error**
    For monitoring`"]
    
    LogError --> UserFeedback["`**User Feedback**
    Friendly error message`"]
    
    Success --> UserDisplay["`**Display to User**
    Normal flow continues`"]
    
    style Validation fill:#f57c00
    style AIResponse fill:#388e3c
    style FallbackResponse fill:#d32f2f
    style Success fill:#388e3c
    style LogError fill:#7b1fa2
```

---

## User Experience Flow

This diagram shows the complete user journey through a café ordering conversation:

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat Interface
    participant W as AI Waiter
    
    Note over U,W: Café Ordering Conversation Flow
    
    W->>C: "Hallo! Welkom. Wat mag het voor u zijn?"
    C->>U: Display greeting + 3 suggestions
    Note over C,U: 1. "Ik wil graag een koffie"<br/>2. "Heeft u appeltaart?"<br/>3. "Mag ik de kaart, alstublieft?"
    
    U->>C: Clicks suggestion: "Ik wil graag een koffie"
    C->>W: Send message
    
    W->>C: "Natuurlijk! Hoe wilt u de koffie?"
    C->>U: Display response + new suggestions
    Note over C,U: 1. "Met melk, alstublieft"<br/>2. "Zwart, zonder suiker"<br/>3. "Wat voor koffie heeft u?"
    
    U->>C: Types: "met melk graag"
    C->>W: Send message
    Note over W: Check grammar: ✓ No correction needed
    
    W->>C: "Prima! Wilt u er ook iets bij?"
    C->>U: Display response + suggestions
    Note over C,U: 1. "Ja, een stuk appeltaart"<br/>2. "Nee, alleen koffie"<br/>3. "Wat heeft u allemaal?"
    
    U->>C: Clicks: "Ja, een stuk appeltaart"
    C->>W: Send message
    
    W->>C: "Uitstekend! Dat is een koffie met melk en appeltaart."
    C->>U: Display response + final suggestions
    Note over C,U: 1. "Dat klopt"<br/>2. "Mag ik de rekening?"<br/>3. "Hier of mee naar huis?"
    
    U->>C: Clicks: "Mag ik de rekening?"
    C->>W: Send message
    
    W->>C: "Natuurlijk, dat is €6,50 samen."
    C->>U: Display final response
    
    Note over U,W: Conversation Complete ✓
```

---

## Implementation Details

### Hook Architecture

The system uses two main React hooks that work together:

#### useChatApi Hook

```typescript
// Manages API interactions
const { sendMessage, checkGrammar, prepareChatHistory } = useChatApi()

// prepareChatHistory function structure:
// This adds a basic system message, but the main prompt comes from the YAML file
const prepareChatHistory = (messages, currentTopicTitle, newMessage) => {
  return [
    {
      role: 'system',
      content: `You are a helpful assistant helping someone learn Dutch. The current topic is: ${currentTopicTitle}.`
    },
    ...messages
      .filter(msg => msg.role === 'user' || !msg.isStreaming)
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.role === 'user' ? msg.dutch : msg.dutch
      })),
    {
      role: 'user',
      content: newMessage
    }
  ]
}

// Note: The comprehensive system prompt from ordering-cafe.yaml 
// is actually added later in the OpenAI service layer
```

#### useChatMessages Hook

```typescript
// Manages message state and UI operations
const {
  messages,
  addMessage,
  updateMessage,
  toggleTranslation,
  toggleCorrections,
  addUserMessage,
  addAiStreamingMessage
} = useChatMessages()
```

### API Route Processing

The API route follows this processing pattern:

```mermaid
flowchart LR
    Request["`**HTTP Request**
    POST /api/chat/ordering-cafe`"] --> Parse["`**Parse Body**
    Extract messages & user_input`"]
    
    Parse --> Validate["`**Validate Data**
    Check message format`"]
    
    Validate --> LoadConfig["`**Load Prompt Config**
    ordering-cafe.yaml`"]
    
    LoadConfig --> PreparePrompt["`**Prepare Prompt**
    Template + Variables`"]
    
    PreparePrompt --> CallOpenAI["`**Call OpenAI**
    Generate response`"]
    
    CallOpenAI --> FormatResponse["`**Format Response**
    Structure JSON output`"]
    
    FormatResponse --> Return["`**Return Response**
    Send to frontend`"]
    
    style Request fill:#1976d2
    style LoadConfig fill:#f57c00
    style CallOpenAI fill:#388e3c
    style Return fill:#0288d1
```

### Prompt Template Variables

The system replaces these variables in the YAML template:

- `{{chat_history}}`: Previous conversation messages
- `{{latest_user_input}}`: Current user message

### System Prompt Integration

**Important Note**: The comprehensive system prompt is NOT added in the `prepareChatHistory` function. Instead, it's added in the OpenAI service layer:

```typescript
// In lib/openai-service.ts - generateAIResponse function:
const systemPrompt = promptConfig.template  // This is the full YAML template

const systemMessage = {
  role: 'system',
  content: systemPrompt + '\n\nPlease respond with a valid JSON object.'
}

// The final message array sent to OpenAI:
const messages = [
  systemMessage,  // <-- The comprehensive prompt from YAML
  ...conversationHistory  // <-- User/assistant messages from prepareChatHistory
]
```

This means:
1. **Frontend**: `prepareChatHistory` adds basic conversation structure
2. **API Layer**: Loads YAML prompt configuration  
3. **OpenAI Service**: Replaces the basic system message with the comprehensive YAML prompt
4. **Result**: OpenAI receives the full café waiter persona and instructions

### Response Validation

Every AI response is validated for:

1. **Required Fields**: `ai_reply`, `translation`, `correction`, `suggestions`
2. **Suggestion Count**: Exactly 3 suggestions
3. **Suggestion Format**: Each with `dutch` and `english` properties
4. **JSON Structure**: Valid JSON format
5. **Content Quality**: Non-empty responses

---

## Conclusion

The "Ordering at a Café" prompt system demonstrates a sophisticated approach to language learning through interactive conversations. The system combines:

- **Contextual AI Responses**: Realistic waiter behavior
- **Educational Features**: Grammar correction and vocabulary building
- **User-Friendly Interface**: Suggestion-based interactions
- **Robust Error Handling**: Graceful failure management
- **Scalable Architecture**: Easy to extend to new scenarios

This documentation provides the foundation for understanding, maintaining, and extending the café ordering system within the broader Dutch chat application.
