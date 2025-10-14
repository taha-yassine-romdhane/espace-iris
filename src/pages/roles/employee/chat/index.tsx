import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EnhancedChatInput } from '@/components/chat/EnhancedChatInput';
import { EnhancedMessage } from '@/components/chat/EnhancedMessage';
import {
    MessageCircle,
    Send,
    Search,
    Plus,
    Users,
    Clock,
    AlertCircle,
    Phone
} from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from 'axios';
import EmployeeLayout from '../EmployeeLayout';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    telephone?: string;
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    receiverId: string | null;
    conversationId: string | null;
    messageType: string;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
    sender: User;
    receiver?: User;
    replyTo?: {
        id: string;
        content: string;
        sender: {
            firstName: string;
            lastName: string;
        };
    };
}

interface Conversation {
    conversationId: string;
    otherUser: User;
    lastMessage: {
        id: string;
        content: string;
        createdAt: string;
        senderId: string;
    } | null;
    unreadCount: number;
    lastMessageAt: string;
}

const EmployeeChat: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session?.user || session.user.role !== 'EMPLOYEE') {
            router.push('/auth/signin');
            return;
        }

        fetchConversations();
        fetchUsers();
    }, [session, status, router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/messages/conversations');
            setConversations(response.data.conversations);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/messages/users');
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        try {
            const response = await axios.get(`/api/messages?conversationId=${conversationId}`);
            setMessages(response.data.messages);
            
            // Mark messages as read
            await axios.post('/api/messages/mark-read', { conversationId });
            
            // Update conversation to reflect read messages
            fetchConversations();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

        try {
            setSendingMessage(true);
            const response = await axios.post('/api/messages', {
                content: newMessage.trim(),
                receiverId: selectedConversation.otherUser.id,
                conversationId: selectedConversation.conversationId,
                messageType: 'DIRECT'
            });

            setMessages(prev => [...prev, response.data.message]);
            setNewMessage('');
            
            // Update conversations list
            fetchConversations();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSendingMessage(false);
        }
    };

    const startNewConversation = async (userId: string) => {
        try {
            // First check if a conversation already exists
            const existingConversation = conversations.find(conv => conv.otherUser.id === userId);
            
            if (existingConversation) {
                // Select the existing conversation
                handleConversationSelect(existingConversation);
                setShowNewChat(false);
                return;
            }

            // Create a new conversation without sending a message
            const user = users.find(u => u.id === userId);
            
            if (user) {
                // Generate conversation ID the same way the API does
                const sortedIds = [session?.user?.id, userId].sort();
                const conversationId = `conv_${sortedIds[0]}_${sortedIds[1]}`;

                const newConversation: Conversation = {
                    conversationId,
                    otherUser: user,
                    lastMessage: null,
                    unreadCount: 0,
                    lastMessageAt: new Date().toISOString()
                };

                setSelectedConversation(newConversation);
                setMessages([]);
                setShowNewChat(false);
                
                // Update conversations list to include the new empty conversation
                setConversations(prev => [newConversation, ...prev]);
            }
        } catch (error) {
            console.error('Error starting new conversation:', error);
        }
    };

    const handleConversationSelect = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        fetchMessages(conversation.conversationId);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 168) { // 1 week
            return date.toLocaleDateString('fr-FR', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        }
    };

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName[0]}${lastName[0]}`.toUpperCase();
    };

    const getUserFullName = (user: User) => {
        return `${user.firstName} ${user.lastName}`;
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-blue-100 text-blue-800';
            case 'EMPLOYEE':
                return 'bg-green-100 text-green-800';
            case 'DOCTOR':
                return 'bg-red-100 text-red-800';
            case 'TECHNICIAN':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredUsers = users.filter(user =>
        getUserFullName(user).toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="text-green-700">Chargement des messages...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg border border-green-200 overflow-hidden">
                {/* Conversations List */}
                <div className="w-1/3 border-r border-green-200 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-green-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-green-700 flex items-center">
                                <MessageCircle className="h-5 w-5 mr-2" />
                                Messages
                            </h2>
                            <Button
                                onClick={() => setShowNewChat(true)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Conversations */}
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length > 0 ? (
                            conversations.map((conversation) => (
                                <div
                                    key={conversation.conversationId}
                                    onClick={() => handleConversationSelect(conversation)}
                                    className={cn(
                                        "p-4 border-b border-green-100 cursor-pointer hover:bg-green-50 transition-colors",
                                        selectedConversation?.conversationId === conversation.conversationId && "bg-green-50 border-r-2 border-r-green-500"
                                    )}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="relative">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="bg-gray-200 text-gray-700">
                                                    {getInitials(conversation.otherUser.firstName, conversation.otherUser.lastName)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                                    {getUserFullName(conversation.otherUser)}
                                                </h3>
                                                <div className="flex items-center space-x-1">
                                                    {conversation.unreadCount > 0 && (
                                                        <span className="bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                            {conversation.unreadCount}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-500">
                                                        {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center mt-1">
                                                <span className={cn(
                                                    "inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2",
                                                    getRoleColor(conversation.otherUser.role)
                                                )}>
                                                    {conversation.otherUser.role}
                                                </span>
                                                <span className="text-xs text-gray-500 truncate">
                                                    {conversation.lastMessage?.content || 'Nouvelle conversation'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600">Aucune conversation</p>
                                <Button
                                    onClick={() => setShowNewChat(true)}
                                    variant="outline"
                                    className="mt-4 border-green-200 text-green-700 hover:bg-green-50"
                                >
                                    Commencer une conversation
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-green-200 bg-green-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-gray-200 text-gray-700">
                                                {getInitials(selectedConversation.otherUser.firstName, selectedConversation.otherUser.lastName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">
                                                {getUserFullName(selectedConversation.otherUser)}
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <span className={cn(
                                                    "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                                                    getRoleColor(selectedConversation.otherUser.role)
                                                )}>
                                                    {selectedConversation.otherUser.role}
                                                </span>
                                            </div>
                                            {selectedConversation.otherUser.telephone && (
                                                <div className="text-sm text-gray-600 mt-1 flex items-center">
                                                    <Phone className="h-3 w-3 mr-1" />
                                                    {selectedConversation.otherUser.telephone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {messages.map((message) => {
                                    const isMine = message.senderId === session?.user?.id;
                                    return (
                                        <EnhancedMessage
                                            key={message.id}
                                            message={message}
                                            isOwnMessage={isMine}
                                            colorScheme="green"
                                            onReferenceClick={(type, id) => {
                                                console.log('Reference clicked:', type, id);
                                                // TODO: Navigate to referenced item or show details
                                            }}
                                        />
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Enhanced Message Input */}
                            <div className="p-4 border-t border-green-200">
                                <EnhancedChatInput
                                    message={newMessage}
                                    onChange={setNewMessage}
                                    onSend={sendMessage}
                                    disabled={sendingMessage}
                                    placeholder="Tapez votre message..."
                                    colorScheme="green"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Sélectionnez une conversation
                                </h3>
                                <p className="text-gray-600">
                                    Choisissez une conversation existante ou commencez-en une nouvelle
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center">
                                    <Users className="h-5 w-5 mr-2" />
                                    Nouvelle Conversation
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowNewChat(false)}
                                >
                                    ×
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Rechercher un utilisateur..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="border-green-200 focus:border-green-500"
                                />
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                onClick={() => startNewConversation(user.id)}
                                                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-gray-200 text-gray-700">
                                                        {getInitials(user.firstName, user.lastName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium text-gray-900">
                                                            {getUserFullName(user)}
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className={cn(
                                                            "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                                                            getRoleColor(user.role)
                                                        )}>
                                                            {user.role}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-500">
                                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                                            <p className="text-sm">Aucun utilisateur trouvé</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

(EmployeeChat as any).getLayout = function getLayout(page: React.ReactElement) {
    return <EmployeeLayout>{page}</EmployeeLayout>;
};

export default EmployeeChat;