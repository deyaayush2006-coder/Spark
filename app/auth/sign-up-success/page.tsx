import Link from 'next/link'
import { Heart, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 love-gradient opacity-5" />
      
      <Card className="w-full max-w-md relative animate-bounce-in text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full love-gradient flex items-center justify-center animate-heartbeat">
              <Mail className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif">Check your email</CardTitle>
          <CardDescription className="text-base">
            {"We've sent you a confirmation link. Click it to activate your account and start finding love!"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <span>Your journey to love begins soon</span>
            <Heart className="h-4 w-4 text-primary fill-primary" />
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/login">
              Back to login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
