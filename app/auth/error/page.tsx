import Link from 'next/link'
import { Heart, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 love-gradient opacity-5" />
      
      <Card className="w-full max-w-md relative animate-slide-up text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif">Something went wrong</CardTitle>
          <CardDescription className="text-base">
            We couldn&apos;t complete your authentication. This might be because the link expired or was already used.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <span>Don&apos;t worry, try again</span>
            <Heart className="h-4 w-4 text-primary fill-primary" />
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full love-gradient text-primary-foreground border-0">
            <Link href="/auth/sign-up">
              Sign up again
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
