"use client"

import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { ChatBubble } from "./chat-bubble"
import type { Message } from "./chat-message.interface"


export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      dutch: input,
      showTranslation: false,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    const chatHistory = updatedMessages
      .map((msg) => `${msg.role === "user" ? "Gebruiker" : "AI"}: ${msg.dutch}`)
      .join("\n")

    try {
      const response = await fetch("/api/chat/ordering-cafe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.dutch
          })),
          user_input: input
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to get response');
      }

      const result = await response.json();
      console.log('API Response:', result);

      const aiMessage: Message = {
        id: uuidv4(),
        role: "ai",
        dutch: result.ai_reply || 'Sorry, I could not generate a response.',
        english: result.translation || '',
        correction: result.correction || { correctedDutch: '', explanation: '' },
        showTranslation: false,
      }

      setMessages((prev) => [...prev, aiMessage])
      setInput("")
    } catch (err) {
      console.error("Failed to fetch reply:", err)
    }
  }

  const toggleTranslate = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, showTranslation: !msg.showTranslation } : msg
      )
    )
  }

  return (
    <div className="flex flex-col h-full p-4 bg-white rounded-lg shadow-md">
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[500px]">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} onToggleTranslate={toggleTranslate} />
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 p-2 border rounded text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type in Dutch..."
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  )
}
