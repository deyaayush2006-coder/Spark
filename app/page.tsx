import Link from 'next/link'
import { Heart, Sparkles, MessageCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingHearts } from '@/components/floating-hearts'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingHearts />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Heart className="h-8 w-8 text-primary fill-primary animate-heartbeat" />
          <span className="text-2xl font-serif font-bold love-gradient-text">Spark</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Log in</Link>
          </Button>
          <Button asChild className="love-gradient text-primary-foreground border-0">
            <Link href="/auth/sign-up">Sign up</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto animate-slide-up">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 text-balance">
            Find Your <span className="love-gradient-text">Perfect Match</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto text-pretty">
            Swipe, match, and connect with amazing people who share your passions. 
            Your love story starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="love-gradient text-primary-foreground border-0 text-lg px-8 py-6">
              <Link href="/auth/sign-up">
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
              <Link href="/auth/login">
                I have an account
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto">
          <FeatureCard
            icon={<Heart className="h-8 w-8" />}
            title="Smart Matching"
            description="Our algorithm finds people who truly match your interests and preferences"
            delay="0s"
          />
          <FeatureCard
            icon={<MessageCircle className="h-8 w-8" />}
            title="Real-time Chat"
            description="Connect instantly with your matches through seamless messaging"
            delay="0.1s"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Social Features"
            description="Follow, connect, and build meaningful relationships"
            delay="0.2s"
          />
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-20">
          <StatItem value="1M+" label="Active Users" />
          <StatItem value="500K+" label="Matches Made" />
          <StatItem value="100K+" label="Success Stories" />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-muted-foreground">
        <p>&copy; 2024 Spark. Made with love.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  delay 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  delay: string
}) {
  return (
    <div 
      className="bg-card rounded-2xl p-6 shadow-sm border animate-slide-up"
      style={{ animationDelay: delay }}
    >
      <div className="w-14 h-14 rounded-full love-gradient flex items-center justify-center text-primary-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-serif font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center animate-fade-in">
      <div className="text-3xl md:text-4xl font-serif font-bold love-gradient-text">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  )
}
