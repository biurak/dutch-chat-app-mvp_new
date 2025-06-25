export interface MessageCorrection {
  correctedDutch: string
  explanation: string
}

export interface Message {
  id: string
  role: "user" | "ai"
  dutch: string // The original Dutch text
  english?: string // For pre-defined or fetched translations
  showTranslation?: boolean
  correction?: MessageCorrection
  isStreaming?: boolean // Indicates if the message is currently being streamed
}
