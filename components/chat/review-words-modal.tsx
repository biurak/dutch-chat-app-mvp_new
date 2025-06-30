"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { X, Clipboard, ArrowLeft, HelpCircle } from "lucide-react"
import type { NewWord } from "@/lib/topics"

interface ReviewWordsModalProps {
  isOpen: boolean
  onClose: () => void
  words: NewWord[]
}

export function ReviewWordsModal({ isOpen, onClose, words }: ReviewWordsModalProps) {
  const [visibleWords, setVisibleWords] = useState<NewWord[]>([])
  const [step, setStep] = useState<"select" | "preview">("select")
  const [isInstructionsVisible, setIsInstructionsVisible] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      setVisibleWords(words)
      setStep("select")
      setIsInstructionsVisible(false) // Reset on open
    }
  }, [isOpen, words])

  const handleRemoveWord = (wordToRemove: NewWord) => {
    setVisibleWords(visibleWords.filter((word) => word.dutch !== wordToRemove.dutch))
  }

  const handleCopyToQuizlet = () => {
    const quizletString = visibleWords
      .map((word) => `${word.dutch}\t${word.english} — (e.g., "${word.dutch_sentence}")`)
      .join("\n")

    navigator.clipboard.writeText(quizletString).then(
      () => {
        toast({
          title: "Copied successfully!",
          description: "You can now paste this list into Quizlet.",
        })
      },
      (err) => {
        console.error("Could not copy text: ", err)
        toast({
          variant: "destructive",
          title: "Copy failed",
          description: "Could not copy to clipboard. Please try again.",
        })
      },
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-full w-full h-full max-h-screen flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-row items-center">
          {step === "preview" && (
            <Button variant="ghost" size="icon" className="mr-2" onClick={() => setStep("select")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle className="text-lg">{step === "select" ? "Potential New Words" : "Review & Copy"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow">
          <div className="p-4">
            {step === "select" && (
              <>
                <p className="text-sm text-muted-foreground mb-4">Remove any words you already know.</p>
                <div className="flex flex-wrap gap-2">
                  {visibleWords.map((word) => (
                    <div
                      key={word.dutch}
                      className="flex items-center gap-2 bg-slate-100 rounded-full pl-4 pr-2 py-1 text-sm"
                    >
                      <span>{word.dutch}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => handleRemoveWord(word)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === "preview" && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Here is your final list. Click below to copy it for Quizlet.
                </p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dutch</TableHead>
                        <TableHead>Example</TableHead>
                        <TableHead>English</TableHead>
                        <TableHead>Example Translation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleWords.map((word) => (
                        <TableRow key={word.dutch}>
                          <TableCell className="font-medium">{word.dutch}</TableCell>
                          <TableCell>{word.dutch_sentence}</TableCell>
                          <TableCell>{word.english}</TableCell>
                          <TableCell>{word.english_sentence}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-slate-50">
          {step === "select" ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => setStep("preview")}
              disabled={visibleWords.length === 0}
            >
              {`Preview List (${visibleWords.length} words)`}
            </Button>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <Button className="w-full" size="lg" onClick={handleCopyToQuizlet}>
                <Clipboard className="mr-2 h-4 w-4" /> Copy for Quizlet
              </Button>

              {!isInstructionsVisible && (
                <Button
                  variant="link"
                  className="text-muted-foreground h-auto p-1 mt-2"
                  onClick={() => setIsInstructionsVisible(true)}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  How do I import this to Quizlet?
                </Button>
              )}

              {isInstructionsVisible && (
                <div className="w-full max-w-md mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left border relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setIsInstructionsVisible(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <h4 className="font-semibold text-sm mb-2 text-center text-slate-800 dark:text-slate-200">
                    How to Import to Quizlet ✨
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-2">
                    <li>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">📋 Copy your list</span> using
                      the button above.
                    </li>
                    <li>
                      In Quizlet, go to{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Create → Study set</span>.
                    </li>
                    <li>
                      Click the <span className="font-semibold text-slate-700 dark:text-slate-300">Import</span> button
                      (don't miss it!).
                    </li>
                    <li>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">📝 Paste your list</span> right
                      into the text box.
                    </li>
                    <li>
                      Hit <span className="font-semibold text-slate-700 dark:text-slate-300">Import</span> and you're
                      ready to study! ✅
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
