'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Home, User, Settings, LogOut, Sparkles, Search, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        // Fetch the user's profile to get their username
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
        
        if (!error && data) {
          setUsername(data.username);
        }
      }
    };
    
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="border-b border-gray-800/50 bg-black/50 backdrop-blur-sm w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-emerald-500" />
            <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
              ollo
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              // Logged in navigation
              <>
                <Link href="/feed">
                  <Button variant={pathname === '/feed' ? 'default' : 'ghost'}>
                    <Home className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button variant={pathname === '/explore' ? 'default' : 'ghost'}>
                    <Search className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button variant={pathname === '/chat' ? 'default' : 'ghost'}>
                    <Wand2 className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href={username ? `/${username}` : '/profile'}>
                  <Button variant={pathname === `/${username}` || pathname === '/profile' ? 'default' : 'ghost'}>
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant={pathname === '/settings' ? 'default' : 'ghost'}>
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              // Logged out navigation
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-sm">Sign in</Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
