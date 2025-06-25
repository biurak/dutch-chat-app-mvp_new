"use client"

import type React from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { topics } from "@/lib/topics"
import { ChatContainer } from "@/components/chat/ChatContainer"

import {
  MessageSquareText,
  Coffee,
  Stethoscope,
  ShoppingCart,
  Home,
  Bus,
  Users,
  Briefcase,
  Heart,
  CalendarPlus,
} from "lucide-react"

const topicIcons: Record<string, React.ElementType> = {
  "ordering-cafe": Coffee,
  "visiting-doctor": Stethoscope,
  "buying-groceries": ShoppingCart,
  "talking-landlord": Home,
  "asking-directions-transport": Bus,
  "introducing-yourself-smalltalk": Users,
  "talking-about-work": Briefcase,
  "hobbies-pets": Heart,
  "making-appointment-reservation": CalendarPlus,
}

export default function HomePage() {
  const handleTopicSelect = (topicTitle: string) => {
    console.log("Selected topic:", topicTitle)
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-sky-50 to-sky-100 p-4 pt-8 md:pt-16">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <MessageSquareText className="w-12 h-12 text-primary mr-3" />
          <h1 className="text-4xl font-bold text-slate-800">Dutch Chat</h1>
        </div>
        <p className="text-lg text-slate-600">Practice your Dutch with an AI conversation partner!</p>
      </header>

      <main className="w-full max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {topics.map((topic) => {
            const IconComponent = topicIcons[topic.slug] || MessageSquareText
            return (
              <Card
                key={topic.slug}
                className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white flex flex-col"
              >
                <CardHeader className="items-center text-center">
                  <IconComponent className="w-10 h-10 text-primary mb-2" />
                  <CardTitle className="text-xl text-slate-700">{topic.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex-grow">
                  <CardDescription className="text-sm text-slate-500 min-h-[3em]">{topic.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => handleTopicSelect(topic.title)}
                  >
                    <Link href={`/${topic.slug}`}>Start Chat</Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </main>
      <div className="w-full max-w-4xl mt-12 mb-8">
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Try the Chat</h2>
          <ChatContainer />
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Dutch Learning Chatbot MVP. Happy learning!</p>
      </footer>
    </div>
  )
}
