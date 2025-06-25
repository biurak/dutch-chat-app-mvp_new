export interface Topic {
  slug: string
  title: string
  description: string
  initialAiMessage: {
    dutch: string
    english: string // For simulation
  }
  initialSuggestions: Array<{
    dutch: string
    english: string // For simulation
  }>
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
  },
  {
    slug: "visiting-doctor",
    title: "Visiting the Doctor",
    description: "Practice describing symptoms and talking with a doctor.",
    initialAiMessage: {
      dutch: "Hallo! Wat scheelt er vandaag?",
      english: "Hello! What seems to be the problem today?"
    },
    initialSuggestions: [
      { dutch: "Ik heb hoofdpijn.", english: "I have a headache." },
      { dutch: "Ik voel me niet goed.", english: "I don't feel well." },
      { dutch: "Ik heb een afspraak.", english: "I have an appointment." }
    ]
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
  },
  // New Topics
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
  },
]

export const getTopicBySlug = (slug: string): Topic | undefined => {
  // Normalize the slug by replacing underscores with hyphens
  const normalizedSlug = slug.replace(/_/g, '-');
  return topics.find((topic) => topic.slug === normalizedSlug);
}
