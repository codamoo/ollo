import AuthForm from '@/components/auth-form'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-white mb-8">Welcome Back</h1>
        <AuthForm />
      </div>
    </div>
  )
}
