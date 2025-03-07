"use client"

import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import Navbar from "@/components/navbar";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY!);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  conversation_id?: string;
  sequence_number?: number;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>(uuidv4());
  const router = useRouter();

  const [conversations, setConversations] = useState<{ id: string, preview: string, created_at: string }[]>([]);

  useEffect(() => {
    checkUser();
    loadChatHistory();
  }, []);

  const checkUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);
  };

  const loadChatHistory = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading chat history:', error);
      return;
    }

    if (data && data.length > 0) {
      setMessages(data.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        id: msg.id,
        conversation_id: msg.conversation_id,
        sequence_number: msg.sequence_number
      })));
      setConversationId(data[0].conversation_id);
    }
  };

  const saveMessage = async (message: Message, sequence: number) => {
    if (!userId) return;

    const { error } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        role: message.role,
        content: message.content,
        conversation_id: conversationId,
        sequence_number: sequence
      });

    if (error) {
      console.error('Error saving message:', error);
    }
  };

  const loadConversations = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('chat_history')
      .select('conversation_id, content, created_at')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    const uniqueConversations = data.reduce((acc: any[], curr) => {
      if (!acc.find(c => c.id === curr.conversation_id)) {
        acc.push({
          id: curr.conversation_id,
          preview: curr.content.slice(0, 60) + (curr.content.length > 60 ? '...' : ''),
          created_at: new Date(curr.created_at).toLocaleDateString()
        });
      }
      return acc;
    }, []);

    setConversations(uniqueConversations);
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(uuidv4());
  };

  const switchConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true });

    if (error) {
      console.error('Error loading conversation:', error);
      return;
    }

    setConversationId(conversationId);
    setMessages(data.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      id: msg.id,
      conversation_id: msg.conversation_id,
      sequence_number: msg.sequence_number
    })));
  };

  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId, messages]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;

    try {
      setLoading(true);
      const userMessage = { role: 'user' as const, content: input };
      
      // Save user message
      await saveMessage(userMessage, messages.length);
      
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');

      // Get Gemini response
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const chat = model.startChat({
        history: messages.map(msg => ({
          role: msg.role,
          parts: msg.content,
        })),
      });

      const result = await chat.sendMessage(input);
      const response = await result.response;
      const text = await response.text();

      // Save assistant message
      const assistantMessage = { role: 'assistant' as const, content: text };
      await saveMessage(assistantMessage, messages.length + 1);
      
      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-1 h-[90vh] bg-background">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-card hidden md:block">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <Button 
                className="w-full"
                onClick={startNewChat}
              >
                New Chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => switchConversation(conv.id)}
                  className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                    conv.id === conversationId ? 'bg-accent' : ''
                  }`}
                >
                  <p className="text-sm font-medium truncate">{conv.preview}</p>
                  <p className="text-xs text-muted-foreground mt-1">{conv.created_at}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 overflow-y-auto pb-36">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-2">
                  <Bot className="w-12 h-12 mx-auto text-muted-foreground" />
                  <h1 className="text-2xl font-bold text-foreground">How can I help you today?</h1>
                  <p className="text-sm text-muted-foreground">Ask me anything - I'm here to help!</p>
                </div>
              </div>
            ) : (
              <div className="pt-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`px-4 md:px-6 lg:px-8 ${
                      message.role === 'assistant' ? 'bg-secondary/50' : ''
                    }`}
                  >
                    <div className="max-w-3xl mx-auto py-5 flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {message.role === 'assistant' ? (
                          <Bot className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div className="prose prose-sm dark:prose-invert flex-1 min-w-0">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({children}) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                              h2: ({children}) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                              h3: ({children}) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                              p: ({children}) => <p className="break-words mb-4">{children}</p>,
                              ul: ({children}) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal ml-6 mb-4">{children}</ol>,
                              li: ({children}) => <li className="mb-1">{children}</li>,
                              code: ({node, inline, className, children, ...props}) => (
                                inline ? 
                                  <code className="bg-secondary/50 rounded px-1 py-0.5" {...props}>{children}</code> :
                                  <pre className="bg-secondary/50 p-4 rounded-lg overflow-x-auto">
                                    <code className="block" {...props}>{children}</code>
                                  </pre>
                              ),
                              blockquote: ({children}) => (
                                <blockquote className="border-l-4 border-primary/20 pl-4 italic my-4">{children}</blockquote>
                              ),
                              a: ({href, children}) => (
                                <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              ),
                              table: ({children}) => (
                                <div className="overflow-x-auto mb-4">
                                  <table className="min-w-full divide-y divide-border">{children}</table>
                                </div>
                              ),
                              th: ({children}) => <th className="px-4 py-2 bg-secondary/50">{children}</th>,
                              td: ({children}) => <td className="px-4 py-2 border-t border-border">{children}</td>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="px-4 md:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto py-5 flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-background/90 pt-6 pb-4">
            <div className="max-w-3xl mx-auto px-4">
              <Card className="flex items-end gap-2 p-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message Gemini..."
                  className="min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  size="icon"
                  className="h-[34px] w-[34px] shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </Card>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Gemini may display inaccurate info, including about people, places, or facts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}