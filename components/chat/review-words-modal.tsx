'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check, Clipboard, HelpCircle, Loader2, Copy, ExternalLink } from 'lucide-react'
import { NewWord } from '@/lib/topics'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Volume2 } from 'lucide-react'

type ReviewMode = 'select' | 'preview'

interface ReviewWordsModalProps {
  isOpen: boolean
  onClose: () => void
  words?: NewWord[]
}

export function ReviewWordsModal({ isOpen, onClose, words = [] }: ReviewWordsModalProps) {
  const [filteredWords, setFilteredWords] = useState<NewWord[]>([])
  const [reviewMode, setReviewMode] = useState<ReviewMode>('select')
  const [selectedWords, setSelectedWords] = useState<NewWord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showImportHelp, setShowImportHelp] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      // Initialize with all words when modal opens
      setFilteredWords([...words])
      setReviewMode('select')
    }
  }, [isOpen, words])

  const handleRemoveWord = (wordToRemove: NewWord) => {
    setFilteredWords(prev => 
      prev.filter(word => word.dutch !== wordToRemove.dutch)
    )
  }

  const handlePlayAudio = (text: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  const handleCopyToQuizlet = () => {
    if (filteredWords.length === 0) {
      toast({
        title: 'No words to export',
        description: 'Add words to your list first.',
      })
      return
    }
    
    const quizletString = filteredWords
      .map((word) => `${word.dutch}\t${word.english} — (e.g., "${word.dutch_sentence}")`)
      .join('\n')

    navigator.clipboard.writeText(quizletString).then(
      () => {
        toast({
          title: 'Copied successfully!',
          description: 'You can now paste this list into Quizlet.',
        })
      },
      (err) => {
        console.error('Could not copy text: ', err)
        toast({
          variant: 'destructive',
          title: 'Copy failed',
          description: 'Could not copy to clipboard. Please try again.',
        })
      }
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-full w-full h-full max-h-screen flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-row items-center">
          {reviewMode === 'preview' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 mr-2"
              onClick={() => setReviewMode('select')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle className="text-lg">
            {reviewMode === 'select' ? 'Potential New Words' : 'Preview & Export'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow">
          <div className="p-4">
            {reviewMode === 'select' ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Review the potential new words below. Remove any words you don't want to include.
                </p>
                <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto">
                  {filteredWords.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No words to review</p>
                  ) : (
                    filteredWords.map((word) => (
                      <div
                        key={word.dutch}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{word.dutch}</div>
                          <div className="text-sm text-muted-foreground">{word.english}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                          onClick={() => handleRemoveWord(word)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Review your selected words before exporting.
                </p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Dutch Word</TableHead>
                        <TableHead>Dutch Sentence</TableHead>
                        <TableHead>English Translation</TableHead>
                        <TableHead>Sentence Translation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                            No words to display
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWords.map((word) => (
                          <TableRow key={word.dutch}>
                            <TableCell className="font-medium">{word.dutch}</TableCell>
                            <TableCell className="max-w-[300px]">
                              <div className="flex items-center gap-2">
                                <span>{word.dutch_sentence}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-slate-900"
                                  onClick={() => handlePlayAudio(word.dutch_sentence)}
                                >
                                  <Volume2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{word.english}</TableCell>
                            <TableCell>{word.english_sentence}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-slate-50">
          {reviewMode === 'select' ? (
            <div className="w-full flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                onClick={() => setReviewMode('preview')}
                disabled={filteredWords.length === 0}
              >
                Preview List ({filteredWords.length})
              </Button>
            </div>
          ) : (
            <div className="w-full flex justify-between">
              <Button variant="outline" onClick={() => setReviewMode('select')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleCopyToQuizlet}>
                  <Clipboard className="mr-2 h-4 w-4" /> Copy for Quizlet
                </Button>
                <Button
                  variant="link"
                  className="text-xs text-muted-foreground hover:text-foreground h-auto p-0"
                  onClick={() => setShowImportHelp(true)}
                >
                  <HelpCircle className="inline-block mr-1 h-3 w-3" /> How to import
                </Button>
                
                <Dialog open={showImportHelp} onOpenChange={setShowImportHelp}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>How to Import to Quizlet</DialogTitle>
                      <DialogDescription className="pt-2">
                        Follow these steps to import your words into Quizlet
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          1
                        </div>
                        <div>
                          <h4 className="font-medium">Go to Quizlet</h4>
                          <p className="text-sm text-muted-foreground">
                            Visit <a href="https://quizlet.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">quizlet.com <ExternalLink className="ml-1 h-3 w-3" /></a> and log in to your account
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          2
                        </div>
                        <div>
                          <h4 className="font-medium">Create a new study set</h4>
                          <p className="text-sm text-muted-foreground">
                            Click on <span className="font-medium">Create</span> in the sidebar
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          3
                        </div>
                        <div>
                          <h4 className="font-medium">Import your words</h4>
                          <p className="text-sm text-muted-foreground">
                            Click on <span className="font-medium">Import from Word, Excel, Google Docs, etc.</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          4
                        </div>
                        <div>
                          <h4 className="font-medium">Paste your words</h4>
                          <p className="text-sm text-muted-foreground">
                            Paste the copied text into the import box
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 text-xs h-8"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedWords.map(w => `${w.dutch}\t${w.english}`).join('\n'))
                              toast({
                                title: 'Copied!',
                                description: 'Your words have been copied to the clipboard',
                              })
                            }}
                          >
                            <Copy className="mr-2 h-3 w-3" /> Copy words to clipboard
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          5
                        </div>
                        <div>
                          <h4 className="font-medium">Complete the import</h4>
                          <p className="text-sm text-muted-foreground">
                            Click <span className="font-medium">Upload</span> to create your study set
                          </p>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setShowImportHelp(false)}>Got it!</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
