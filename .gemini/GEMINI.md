
# Dutch Chat App

This is a Next.js application designed to help users practice their Dutch language skills through interactive chat sessions with an AI assistant. The application provides a topic-based learning environment where users can engage in conversations, receive grammar corrections, and learn new vocabulary.

## Key Features

- **AI-Powered Chat:** Users can have conversations with an AI assistant on various topics.
- **Grammar Correction:** The application checks user input for grammatical errors and provides corrections.
- **Text-to-Speech:** Users can listen to the pronunciation of Dutch words and phrases.
- **Voice Input:** The application supports voice input for a more natural conversation experience.
- **Vocabulary Building:** The application identifies and highlights new vocabulary words, allowing users to review them later.
- **Translation:** Users can toggle between Dutch and English translations of messages.
- **Topic-Based Learning:** The application offers a variety of conversation topics to choose from.
- **User Authentication:** Users can sign in to track their progress and saved words.

## Tech Stack

- **Framework:** Next.js
- **Backend:** Convex
- **Authentication:** Convex Auth
- **UI:** React, Tailwind CSS, Shadcn UI
- **Language:** TypeScript
- **API:** OpenAI

## Project Structure

- `app/`: Contains the main application logic, including pages and API routes.
- `components/`: Contains reusable UI components.
- `convex/`: Contains the Convex backend configuration, including the database schema and authentication settings.
- `hooks/`: Contains custom React hooks for managing application state and logic.
- `lib/`: Contains utility functions and services, such as the OpenAI service and topic data.
- `prompt/`: Contains YAML files with prompts for different conversation topics.
- `public/`: Contains static assets, such as images and fonts.

## Getting Started

To run the application locally, you will need to have Node.js and pnpm installed.

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Run the development server:**
   ```bash
   pnpm dev
   ```

3. **Open the application in your browser:**
   [http://localhost:3000](http://localhost:3000)

## Scripts

- `pnpm dev`: Starts the development server.
- `pnpm build`: Builds the application for production.
- `pnpm start`: Starts the production server.
- `pnpm lint`: Lints the codebase.
- `pnpm clean`: Removes the `.next`, `node_modules`, and `package-lock.json` files.
