"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"
import type { Message } from "./chat-message.interface"

interface ChatBubbleProps {
  message: Message
  onToggleTranslate: (messageId: string) => void
}

export function ChatBubble({ message, onToggleTranslate }: ChatBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full mb-2", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] p-3 rounded-xl shadow-md flex flex-col",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted text-muted-foreground rounded-bl-none",
        )}
      >
        <p className="whitespace-pre-wrap text-sm">{message.dutch}</p>

        {message.correction && isUser && (
          <div className="mt-2 pt-2 border-t border-primary-foreground/30">
            <p className="text-sm font-semibold text-green-300">{message.correction.correctedDutch}</p>
            <p className="text-xs italic text-primary-foreground/80 mt-1">{message.correction.explanation}</p>
          </div>
        )}

        {message.showTranslation && message.english && (
          <p className="mt-2 pt-2 border-t border-muted-foreground/30 text-xs italic text-gray-400 dark:text-gray-500">
            {isUser ? <span className="text-primary-foreground/70">{message.english}</span> : message.english}
          </p>
        )}

        <div className="mt-2 flex items-center self-start">
          {message.english && ( // Only show translate button if English version exists
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleTranslate(message.id)}
              className={cn(
                "text-xs p-1 h-auto",
                isUser
                  ? "text-primary-foreground/70 hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={message.showTranslation ? "Hide translation" : "Show translation"}
            >
              <Languages className="w-3.5 h-3.5 mr-1" />
              {message.showTranslation ? "Hide" : "Translate"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
