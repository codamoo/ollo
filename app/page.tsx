'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  ArrowRight, 
  Code, 
  Globe, 
  Users,
  Sparkles,
  MessageSquare,
  Share2,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#030712] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="border-b border-gray-800/50 bg-black/50 backdrop-blur-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                ollo
              </span>
            </div>
            <div className="flex gap-4 items-center">
              <Link href="/login">
                <Button variant="ghost" className="text-sm">Sign in</Button>
              </Link>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div 
          initial="initial"
          animate="animate"
          variants={stagger}
          className="min-h-screen flex flex-col items-center justify-center text-center py-20 lg:py-32"
        >
          <motion.div variants={fadeIn} className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 blur-3xl opacity-20 rounded-full" />
            <h1 className="text-5xl lg:text-7xl font-bold relative">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                Create. Connect.
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                Inspire.
              </span>
            </h1>
          </motion.div>

          <motion.p 
            variants={fadeIn}
            className="text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto mb-12"
          >
            Join a thriving community of creators sharing their stories, ideas, and passions.
            Build your audience and grow your influence.
          </motion.p>

          <motion.div 
            variants={fadeIn}
            className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 w-full sm:w-auto"
          >
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600">
                Start Creating <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 border-gray-700 hover:bg-gray-800">
                Learn More
              </Button>
            </Link>
          </motion.div>

          <motion.div 
            variants={fadeIn}
            className="mt-20 flex flex-wrap justify-center gap-8 items-center"
          >
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-5 h-5" />
              <span>10K+ Users</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <MessageSquare className="w-5 h-5" />
              <span>50K+ Posts</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Share2 className="w-5 h-5" />
              <span>100K+ Shares</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 py-20"
          id="features"
        >
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group p-8 bg-gray-800/20 border-gray-700/50 hover:bg-gray-800/40 transition-all duration-300 backdrop-blur-sm"
            >
              <feature.icon className="w-12 h-12 text-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-300" />
              <h2 className="text-2xl font-semibold mb-4">{feature.title}</h2>
              <p className="text-gray-400 mb-6">{feature.description}</p>
              <Link href={feature.link} className="flex items-center text-emerald-400 hover:text-emerald-300 transition-colors">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Card>
          ))}
        </motion.div>

        {/* Social Proof */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="py-20 border-t border-gray-800/50"
        >
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Join the Movement</h2>
            <p className="text-xl text-gray-400 mb-12">
              Connect with creators across multiple platforms and build your digital presence.
            </p>
            <div className="flex justify-center gap-8">
              <Twitter className="w-12 h-12 text-[#1DA1F2] opacity-75 hover:opacity-100 transition-all hover:scale-110 cursor-pointer" />
              <Instagram className="w-12 h-12 text-[#E1306C] opacity-75 hover:opacity-100 transition-all hover:scale-110 cursor-pointer" />
              <Facebook className="w-12 h-12 text-[#4267B2] opacity-75 hover:opacity-100 transition-all hover:scale-110 cursor-pointer" />
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="py-20 border-t border-gray-800/50"
        >
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of creators who are already sharing their stories.
            </p>
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600">
                Create Your Account <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="py-12 border-t border-gray-800/50 text-center text-gray-400">
          <div className="flex justify-center items-center gap-8 mb-8">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
          <p>© 2024 ollo. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}

const features = [
  {
    icon: Users,
    title: "Build Community",
    description: "Connect with like-minded creators and build meaningful relationships in a supportive environment.",
    link: "/features/community"
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Share your content with a worldwide audience and expand your influence across borders.",
    link: "/features/reach"
  },
  {
    icon: Code,
    title: "Developer Tools",
    description: "Access powerful APIs and tools to create custom integrations and enhance your content.",
    link: "/features/api"
  }
];
