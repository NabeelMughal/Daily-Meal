import Link from 'next/link'

export default function SignUpSuccessPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground"><section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center sm:p-10"><Link href="/" className="font-serif text-2xl">crumb<span className="text-primary">.</span></Link><p className="eyebrow mt-12">One last step</p><h1 className="mt-3 font-serif text-4xl">Check your inbox.</h1><p className="mt-4 leading-7 text-muted-foreground">We sent a confirmation link to your email. Follow it to unlock your private cookbook.</p><Link href="/auth/login" className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground">Back to sign in</Link></section></main>
}
