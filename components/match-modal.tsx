'use client'

import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Sparkles } from 'lucide-react'

interface MatchModalProps {
  open: boolean
  onClose: () => void
  matchedProfile: Profile | null
}

export function MatchModal({ open, onClose, matchedProfile }: MatchModalProps) {
  const router = useRouter()

  if (!matchedProfile) return null

  const photo = matchedProfile.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center p-0 overflow-hidden border-0">
        <div className="love-gradient p-8 relative">
          {/* Sparkles decoration */}
          <Sparkles className="absolute top-4 left-4 h-6 w-6 text-white/60 animate-sparkle" />
          <Sparkles className="absolute top-8 right-8 h-4 w-4 text-white/60 animate-sparkle" style={{ animationDelay: '0.5s' }} />
          <Sparkles className="absolute bottom-12 left-8 h-5 w-5 text-white/60 animate-sparkle" style={{ animationDelay: '1s' }} />
          
          <div className="animate-match">
            <h2 className="text-3xl font-serif font-bold text-white mb-2">
              {"It's a Match!"}
            </h2>
            <p className="text-white/80 mb-6">
              You and {matchedProfile.name} liked each other
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <img
                  src={photo}
                  alt={matchedProfile.name}
                  className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-xl"
                />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Heart className="h-6 w-6 text-primary fill-primary animate-heartbeat" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold"
                onClick={() => {
                  onClose()
                  router.push('/matches')
                }}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Send a Message
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/10"
                onClick={onClose}
              >
                Keep Swiping
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
