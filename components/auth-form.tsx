"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'

export default function AuthForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        toast.success('Logged in successfully')
        router.push('/dashboard')
        router.refresh()
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            },
          },
        })
        if (signUpError) throw signUpError

        // Create profile after successful signup
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                user_id: user.id,
                username,
                email,
              },
            ])
          if (profileError) throw profileError
        }

        toast.success('Account created successfully! Please check your email for verification.')
        setIsLogin(true)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('An error occurred during authentication')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {!isLogin && (
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </Button>
      </form>
    </Card>
  )
}
