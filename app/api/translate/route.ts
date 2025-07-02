import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Comprehensive list of A1 level Dutch words to filter out
const A1_LEVEL_WORDS = new Set([
  // Basic pronouns and determiners
  'ik', 'jij', 'je', 'hij', 'zij', 'het', 'we', 'jullie', 'ze', 'mijn', 'jouw', 'zijn', 'haar', 'ons', 'hun', 'deze', 'die', 'dit', 'dat',
  
  // Common verbs (present tense)
  'ben', 'is', 'zijn', 'heb', 'hebt', 'heeft', 'hebben', 'ga', 'gaat', 'gaan', 'doe', 'doet', 'doen', 'kan', 'kunt', 'kunnen',
  'mag', 'moet', 'moeten', 'wil', 'wilt', 'willen', 'zie', 'ziet', 'zien', 'kom', 'komt', 'komen', 'eet', 'eet', 'eten',
  'drink', 'drinkt', 'drinken', 'leef', 'leeft', 'leven', 'leer', 'leert', 'leren', 'maak', 'maakt', 'maken', 'neem', 'neemt', 'nemen',
  'geef', 'geeft', 'geven', 'zeg', 'zegt', 'zeggen', 'weet', 'weten', 'vind', 'vindt', 'vinden', 'sta', 'staat', 'staan', 'loop', 'loopt', 'lopen',
  
  // Common nouns
  'man', 'vrouw', 'kind', 'kindje', 'huis', 'appel', 'brood', 'water', 'melk', 'koffie', 'thee', 'bier', 'wijn', 'eten', 'drinken',
  'dag', 'nacht', 'ochtend', 'middag', 'avond', 'week', 'maand', 'jaar', 'uur', 'minuut', 'seconde', 'vandaag', 'morgen', 'gisteren',
  'straat', 'weg', 'plein', 'park', 'winkel', 'school', 'werk', 'thuis', 'land', 'stad', 'dorp', 'straat', 'huis', 'kamer', 'deur', 'raam',
  
  // Common adjectives
  'goed', 'slecht', 'mooi', 'lelijk', 'groot', 'klein', 'lang', 'kort', 'jong', 'oud', 'nieuw', 'oud', 'leuk', 'stom', 'moeilijk', 'makkelijk',
  'duur', 'goedkoop', 'dik', 'dun', 'zwaar', 'licht', 'sterk', 'zwak', 'snel', 'langzaam', 'vroeg', 'laat', 'veel', 'weinig', 'meer', 'minder',
  
  // Common adverbs and prepositions
  'hier', 'daar', 'ergens', 'overal', 'nergens', 'binnen', 'buiten', 'boven', 'onder', 'naast', 'tussen', 'tegenover', 'achter', 'voor', 'in', 'uit',
  'op', 'aan', 'bij', 'naar', 'van', 'tot', 'door', 'met', 'zonder', 'voor', 'na', 'tijdens', 'sinds', 'totdat', 'omdat', 'want', 'maar', 'of', 'als',
  
  // Common greetings and expressions
  'hallo', 'hoi', 'goedemorgen', 'goedemiddag', 'goedenavond', 'goedenacht', 'dankjewel', 'dank u', 'alsjeblieft', 'alstublieft', 'sorry', 'pardon',
  'ja', 'nee', 'misschien', 'oké', 'prima', 'goed', 'slecht', 'dank', 'bedankt', 'tot ziens', 'doei', 'dag', 'hallo', 'hoi', 'hey'
]);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { word, context } = await request.json();
    
    if (!word || !context) {
      return NextResponse.json(
        { error: 'Word and context are required' },
        { status: 400 }
      );
    }

    // Convert to lowercase and remove any punctuation for checking
    const normalizedWord = word.toLowerCase().replace(/[^a-zàâçéèêëîïôûùüÿæœ']/gi, '');
    
    // Skip very short words (likely A1 level)
    if (normalizedWord.length <= 3) {
      return NextResponse.json({ translation: '' });
    }
    
    // Check against our A1 words list
    if (A1_LEVEL_WORDS.has(normalizedWord)) {
      return NextResponse.json({ translation: '' });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that translates individual Dutch words to English. " +
                   "Only translate words that are A2 level or above (A2, B1, B2, C1, or C2). " +
                   "For A1 level words, return an empty string. " +
                   "Provide only the most common English translation of the word. " +
                   "If the word is part of a common phrase, provide the translation of the entire phrase. " +
                   "Return only the translation, or an empty string if the word is A1 level."
        },
        {
          role: "user",
          content: `Context: ${context}\n\nTranslate the word "${word}" to English.`
        }
      ],
      temperature: 0.3,
      max_tokens: 20
    });

    const translation = completion.choices[0]?.message?.content?.trim() || '';
    
    return NextResponse.json({ translation });
    
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate word' },
      { status: 500 }
    );
  }
}
