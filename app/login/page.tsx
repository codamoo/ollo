import AuthForm from '@/components/auth-form'
import { Heading } from '@/once-ui/components'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="w-full max-w-md">
        <Heading variant="display-strong-s" align="center">Welcome back</Heading>
        <AuthForm />
      </div>
    </div>
  )
}
