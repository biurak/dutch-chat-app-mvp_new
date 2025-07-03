/**
 * Chat Suggestions Component
 * 
 * A reusable UI component that displays conversation suggestion buttons for the Dutch chat application.
 * Helps users continue conversations with contextually relevant Dutch phrases.
 * 
 * Key Features:
 * - Renders array of suggestion buttons with Dutch text
 * - Responsive layout that adapts to different screen sizes
 * - Click handling to send suggestions as chat messages
 * - Conditional rendering (hidden when no suggestions available)
 * - Consistent styling with hover effects
 * 
 * @param suggestions - Array of suggestion objects with Dutch and English text
 * @param onSuggestionClick - Callback function when user clicks a suggestion
 */

interface Suggestion {
	dutch: string
	english: string
}

interface ChatSuggestionsProps {
	suggestions: Suggestion[]
	onSuggestionClick: (e: React.FormEvent, suggestionText: string) => void
}

export function ChatSuggestions({ suggestions, onSuggestionClick }: ChatSuggestionsProps) {
	if (suggestions.length === 0) return null

	return (
		<div className='container flex flex-col items-center justify-between gap-2 xl sm:flex-row '>
			<div className='container px-0 py-3 mx-auto bg-white border-slate-200 xl '>
				<div className='w-full'>
					<div className='flex flex-wrap gap-2 px-0'>
						{suggestions.map((suggestion, index) => (
							<button
								key={index}
								onClick={(e) => {
									e.preventDefault()
									onSuggestionClick(e, suggestion.dutch)
								}}
								className='px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors whitespace-nowrap flex-shrink-0'
							>
								{suggestion.dutch}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
