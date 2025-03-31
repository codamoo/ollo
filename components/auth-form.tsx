"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card } from './ui/card'
import { Button, Input } from '@/once-ui/components'

export default function AuthForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const createProfile = async (userId: string) => {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          username,
          email,
          display_name: username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (profileError) {
      throw profileError
    }
  }

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
        return
      }

      // Validate username format
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        toast.error('Username must be 3-20 characters and can only contain letters, numbers, and underscores')
        return
      }

      // Check if username is available
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking username:', checkError)
        throw new Error('Error checking username availability')
      }

      if (existingUser) {
        toast.error('Username is already taken')
        return
      }

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username,
          },
        },
      })
      
      if (signUpError) throw signUpError

      if (!data.user) {
        throw new Error('No user returned after signup')
      }

      // Create profile
      await createProfile(data.user.id)

      toast.success('Account created successfully! Please check your email for verification.')
      setIsLogin(true)
      
    } catch (error) {
      console.error('Auth error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          toast.error('This email or username is already registered')
        } else if (error.message.includes('invalid email')) {
          toast.error('Please enter a valid email address')
        } else if (error.message.includes('password')) {
          toast.error('Password must be at least 6 characters long')
        } else if (error.message.includes('23514')) { // Check constraint violation
          toast.error('Username contains invalid characters')
        } else if (error.message.includes('23505')) { // Unique violation
          toast.error('This username is already taken')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error('An unexpected error occurred during registration')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <Input
              id="username"
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
              required
              pattern="[a-z0-9_]{3,20}"
              title="Username must be between 3-20 characters and can only contain lowercase letters, numbers, and underscores"
              disabled={loading}
            />
          </div>
        )}
        <div className="space-y-2">
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            required
            disabled={loading}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
        </div>
        <Button
          type="submit"
          fillWidth
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <span className="animate-spin mr-2">⏳</span>
              {isLogin ? 'Signing in...' : 'Creating account...'}
            </div>
          ) : (
            isLogin ? 'Sign In' : 'Create Account'
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          fillWidth
          onClick={() => setIsLogin(!isLogin)}
          disabled={loading}
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Button>
      </form>
    </Card>
  )
}
