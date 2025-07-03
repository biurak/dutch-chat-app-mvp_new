/**
 * Shared Type Definitions for Dutch Chat Application
 * 
 * This file contains all canonical type definitions used across the chat application.
 * These types ensure consistency between components, hooks, and the main chat client.
 */

/**
 * Represents a new Dutch word discovered during conversation
 * Used for vocabulary learning and word review features
 */
export interface NewWord {
  dutch: string
  english: string
  dutch_sentence: string
  english_sentence: string
}

/**
 * Represents a grammar correction with explanation
 * Used in grammar checking and language learning feedback
 */
export interface Correction {
	original: string
	corrected: string
	explanation: string
}

/**
 * Represents a chat message between user and AI assistant
 * Contains text content, metadata, and interactive features state
 */
export interface Message {
	id: string
	role: 'user' | 'ai'
	dutch: string
	english: string
	showTranslation: boolean
	isStreaming?: boolean
	corrections?: Correction[]
	correctedText?: string
	showCorrections?: boolean
	newWords?: NewWord[]
}

/**
 * Represents a conversation topic with its configuration
 * Defines the context and initial setup for Dutch practice conversations
 */
export interface Topic {
  slug: string
  title: string
  description: string
  initialAiMessage: {
    dutch: string
    english: string
  }
  initialSuggestions: Array<{
    dutch: string
    english: string
  }>
  potentialNewWords: NewWord[]
}

export const topics: Topic[] = [
  {
    slug: "ordering-cafe",
    title: "Ordering at a Café",
    description: "Practice conversations for when you visit a Dutch café.",
    initialAiMessage: {
      dutch: "Hallo! Welkom. Wat mag het voor u zijn?",
      english: "Hello! Welcome. What can I get for you?",
    },
    initialSuggestions: [
      { dutch: "Ik wil graag een koffie.", english: "I'd like a coffee." },
      { dutch: "Heeft u appeltaart?", english: "Do you have apple pie?" },
      { dutch: "Mag ik de kaart, alstublieft?", english: "Can I have the menu, please?" },
    ],
    potentialNewWords: [
      {
        dutch: "de rekening",
        english: "the bill",
        dutch_sentence: "Mag ik de rekening, alstublieft?",
        english_sentence: "May I have the bill, please?",
      },
      {
        dutch: "de appeltaart",
        english: "the apple pie",
        dutch_sentence: "De appeltaart is hier heerlijk.",
        english_sentence: "The apple pie here is delicious.",
      },
      {
        dutch: "graag",
        english: "please / gladly",
        dutch_sentence: "Ik wil graag een koffie.",
        english_sentence: "I would gladly like a coffee.",
      },
      {
        dutch: "met slagroom",
        english: "with whipped cream",
        dutch_sentence: "Wilt u slagroom bij de taart?",
        english_sentence: "Would you like whipped cream with the pie?",
      },
    ],
  },
  {
    slug: "visiting-doctor",
    title: "Visiting the Doctor",
    description: "Learn how to talk about health issues with a doctor.",
    initialAiMessage: {
      dutch: "Goedemorgen. Hoe kan ik u helpen?",
      english: "Good morning. How can I help you?",
    },
    initialSuggestions: [
      { dutch: "Ik heb een afspraak.", english: "I have an appointment." },
      { dutch: "Ik voel me niet lekker.", english: "I don't feel well." },
      { dutch: "Ik heb hoofdpijn.", english: "I have a headache." },
    ],
    potentialNewWords: [
      {
        dutch: "de afspraak",
        english: "the appointment",
        dutch_sentence: "Ik heb om 10 uur een afspraak.",
        english_sentence: "I have an appointment at 10 o'clock.",
      },
      {
        dutch: "de hoofdpijn",
        english: "the headache",
        dutch_sentence: "Ik heb al de hele dag hoofdpijn.",
        english_sentence: "I've had a headache all day.",
      },
      {
        dutch: "het recept",
        english: "the prescription",
        dutch_sentence: "De dokter geeft mij een recept.",
        english_sentence: "The doctor gives me a prescription.",
      },
      {
        dutch: "de verzekering",
        english: "the insurance",
        dutch_sentence: "Heeft u een zorgverzekering?",
        english_sentence: "Do you have health insurance?",
      },
    ],
  },
  {
    slug: "buying-groceries",
    title: "Buying Groceries",
    description: "Navigate a Dutch supermarket and ask for products.",
    initialAiMessage: {
      dutch: "Hallo! Kan ik u ergens mee helpen?",
      english: "Hello! Can I help you with anything?",
    },
    initialSuggestions: [
      { dutch: "Waar vind ik de melk?", english: "Where can I find the milk?" },
      { dutch: "Heeft u ook biologische eieren?", english: "Do you also have organic eggs?" },
      { dutch: "Hoeveel kost dit?", english: "How much does this cost?" },
    ],
    potentialNewWords: [
      {
        dutch: "de aanbieding",
        english: "the offer/special",
        dutch_sentence: "Deze week is de kaas in de aanbieding.",
        english_sentence: "The cheese is on offer this week.",
      },
    ],
  },
  {
    slug: "talking-landlord",
    title: "Talking to Your Landlord",
    description: "Discuss rent, repairs, or other housing matters.",
    initialAiMessage: {
      dutch: "Goedendag, met wie spreek ik en waarover belt u?",
      english: "Good day, who am I speaking with and what are you calling about?",
    },
    initialSuggestions: [
      { dutch: "De verwarming doet het niet.", english: "The heating is not working." },
      { dutch: "Ik heb een vraag over mijn huurcontract.", english: "I have a question about my rental contract." },
      { dutch: "Er is een lekkage in de badkamer.", english: "There is a leak in the bathroom." },
    ],
    potentialNewWords: [
      {
        dutch: "de huur",
        english: "the rent",
        dutch_sentence: "Wanneer moet ik de huur betalen?",
        english_sentence: "When do I have to pay the rent?",
      },
    ],
  },
  {
    slug: "asking-directions-transport",
    title: "Directions & Public Transport",
    description: "Ask for directions or navigate public transport.",
    initialAiMessage: {
      dutch: "Kan ik u de weg wijzen of helpen met het openbaar vervoer?",
      english: "Can I show you the way or help with public transport?",
    },
    initialSuggestions: [
      { dutch: "Hoe kom ik bij het Centraal Station?", english: "How do I get to Central Station?" },
      { dutch: "Welke bus gaat naar het Rijksmuseum?", english: "Which bus goes to the Rijksmuseum?" },
      { dutch: "Waar kan ik een OV-chipkaart kopen?", english: "Where can I buy an OV-chipkaart?" },
    ],
    potentialNewWords: [
      {
        dutch: "de OV-chipkaart",
        english: "the public transport card",
        dutch_sentence: "Je moet inchecken met je OV-chipkaart.",
        english_sentence: "You have to check in with your public transport card.",
      },
    ],
  },
  {
    slug: "introducing-yourself-smalltalk",
    title: "Introducing Yourself & Small Talk",
    description: "Practice introductions and casual conversations.",
    initialAiMessage: {
      dutch: "Hallo, leuk je te ontmoeten! Hoe heet je?",
      english: "Hello, nice to meet you! What's your name?",
    },
    initialSuggestions: [
      { dutch: "Mijn naam is...", english: "My name is..." },
      { dutch: "Waar kom je vandaan?", english: "Where are you from?" },
      { dutch: "Wat voor weer is het vandaag?", english: "What's the weather like today?" },
    ],
    potentialNewWords: [
      {
        dutch: "aangenaam",
        english: "pleasant/nice to meet you",
        dutch_sentence: "Aangenaam kennis te maken.",
        english_sentence: "Pleasant to make your acquaintance.",
      },
    ],
  },
  {
    slug: "talking-about-work",
    title: "Talking About Work",
    description: "Discuss your job, colleagues, and work tasks.",
    initialAiMessage: {
      dutch: "Vertel eens, wat voor werk doe je?",
      english: "Tell me, what kind of work do you do?",
    },
    initialSuggestions: [
      { dutch: "Ik werk als...", english: "I work as a..." },
      { dutch: "Hoe was je dag op het werk?", english: "How was your day at work?" },
      { dutch: "Ik heb een vergadering om 10 uur.", english: "I have a meeting at 10 o'clock." },
    ],
    potentialNewWords: [
      {
        dutch: "de vergadering",
        english: "the meeting",
        dutch_sentence: "De vergadering begint om 9 uur.",
        english_sentence: "The meeting starts at 9 o'clock.",
      },
    ],
  },
  {
    slug: "hobbies-pets",
    title: "Hobbies & Pets",
    description: "Chat about your interests, hobbies, or pets.",
    initialAiMessage: {
      dutch: "Heb je hobby's of huisdieren waar je graag over praat?",
      english: "Do you have hobbies or pets you like to talk about?",
    },
    initialSuggestions: [
      { dutch: "Ik hou van lezen.", english: "I like reading." },
      { dutch: "Ik heb een kat.", english: "I have a cat." },
      { dutch: "Wat doe je graag in je vrije tijd?", english: "What do you like to do in your free time?" },
    ],
    potentialNewWords: [
      {
        dutch: "het huisdier",
        english: "the pet",
        dutch_sentence: "Heb jij een huisdier?",
        english_sentence: "Do you have a pet?",
      },
    ],
  },
  {
    slug: "making-appointment-reservation",
    title: "Appointments & Reservations",
    description: "Practice making appointments or reservations.",
    initialAiMessage: {
      dutch: "Hallo, u spreekt met [Bedrijfsnaam]. Waarmee kan ik u van dienst zijn?",
      english: "Hello, you're speaking with [Company Name]. How can I help you?",
    },
    initialSuggestions: [
      { dutch: "Ik wil graag een afspraak maken.", english: "I would like to make an appointment." },
      { dutch: "Kan ik een tafel reserveren voor twee personen?", english: "Can I reserve a table for two people?" },
      { dutch: "Hoe laat heeft u tijd?", english: "What time are you available?" },
    ],
    potentialNewWords: [
      {
        dutch: "reserveren",
        english: "to reserve",
        dutch_sentence: "Ik wil graag een tafel reserveren.",
        english_sentence: "I would like to reserve a table.",
      },
    ],
  },
]

export const getTopicBySlug = (slug: string): Topic | undefined => {
  return topics.find((topic) => topic.slug === slug)
}
