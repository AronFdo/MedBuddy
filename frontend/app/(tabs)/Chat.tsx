import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, FlatList, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/ProfileContext';
import { useRouter } from 'expo-router';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  warning: '#fbbf24',
  success: '#10B981',
  info: '#3B82F6',
  darkGray: '#374151',
  sidebarBg: '#F8FAFC',
};

// Chat Conversation Interface
interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: Date;
}

interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
}

function CustomHeader({ title, onMenuPress }: { title: string; onMenuPress: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <Ionicons name="menu" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

function ChatHistoryItem({ 
  conversation, 
  isActive, 
  onSelect, 
  onDelete 
}: { 
  conversation: ChatConversation; 
  isActive: boolean; 
  onSelect: () => void; 
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.chatHistoryItem, isActive && styles.activeChatHistoryItem]} 
      onPress={onSelect}
      onLongPress={onDelete}
    >
      <View style={styles.chatHistoryContent}>
        <Ionicons 
          name="chatbubbles-outline" 
          size={20} 
          color={isActive ? COLORS.primary : COLORS.gray} 
        />
        <View style={styles.chatHistoryText}>
          <Text style={[styles.chatHistoryTitle, isActive && styles.activeChatHistoryTitle]}>
            {conversation.title}
          </Text>
          <Text style={styles.chatHistoryDate}>
            {conversation.updated_at.toLocaleDateString()}
          </Text>
        </View>
      </View>
      {isActive && (
        <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );
}

function ChatSidebar({ 
  conversations, 
  activeConversationId, 
  onSelectConversation, 
  onNewChat, 
  onDeleteConversation,
  visible,
  onClose
}: { 
  conversations: ChatConversation[]; 
  activeConversationId: string | null; 
  onSelectConversation: (id: string) => void; 
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity style={styles.sidebarOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sidebarContainer} activeOpacity={1} onPress={() => {}}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Chat History</Text>
            <View style={styles.sidebarHeaderButtons}>
              <TouchableOpacity onPress={onNewChat} style={styles.sidebarNewChatButton}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.sidebarCloseButton}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
          </View>
          
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatHistoryItem
                conversation={item}
                isActive={item.id === activeConversationId}
                onSelect={() => onSelectConversation(item.id)}
                onDelete={() => onDeleteConversation(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyHistory}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyHistoryText}>No conversations yet</Text>
                <Text style={styles.emptyHistorySubtext}>Start a new chat to begin</Text>
              </View>
            }
            style={styles.chatHistoryList}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function ChatMessage({ message, profile }: { message: ChatMessage; profile: any }) {
  const isUser = message.sender === 'user';
  
  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.botMessageContainer]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Ionicons name="medical" size={16} color={COLORS.white} />
        </View>
      )}
      <View style={[styles.messageBubble, isUser ? styles.userMessageBubble : styles.botMessageBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
          {message.message}
        </Text>
        <Text style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {isUser && (
        <View style={styles.userAvatar}>
          {profile?.profile_pic_url ? (
            <Image 
              source={{ uri: profile.profile_pic_url }} 
              style={styles.userAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={16} color={COLORS.white} />
          )}
        </View>
      )}
    </View>
  );
}

function ChatInput({ 
  onSend, 
  loading, 
  disabled 
}: { 
  onSend: (message: string) => void; 
  loading: boolean; 
  disabled: boolean;
}) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || loading || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <View style={styles.chatInputContainer}>
      <TextInput
        style={styles.chatInput}
        placeholder="Ask MedBuddy anything..."
        value={input}
        onChangeText={setInput}
        editable={!loading && !disabled}
        onSubmitEditing={handleSend}
        returnKeyType="send"
        multiline
        maxLength={1000}
        blurOnSubmit={false}
        enablesReturnKeyAutomatically={true}
      />
      <TouchableOpacity 
        style={[styles.sendButton, (!input.trim() || loading || disabled) && styles.sendButtonDisabled]} 
        onPress={handleSend}
        disabled={!input.trim() || loading || disabled}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <Ionicons name="send" size={20} color={COLORS.white} />
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function Chat() {
  const { profile, loading: profileLoading } = useProfile();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load conversations from database
  const loadConversations = async () => {
    if (!profile) return;
    
    try {
      // Load messages from ai_conversations table using profile_id
      const { data: messages } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true });

      if (messages && messages.length > 0) {
        // Group messages into conversations (for now, treat all as one conversation)
        const conversation: ChatConversation = {
          id: 'main-conversation',
          title: 'Chat with MedBuddy',
          messages: messages.map(msg => ({
            id: msg.conversation_id,
            sender: msg.sender as 'user' | 'bot',
            message: msg.message,
            timestamp: new Date(msg.created_at)
          })),
          created_at: new Date(messages[0].created_at),
          updated_at: new Date(messages[messages.length - 1].created_at)
        };
        
        setConversations([conversation]);
        setActiveConversation(conversation);
      } else {
        // No existing conversations for this profile
        setConversations([]);
        setActiveConversation(null);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };



  // Create new conversation
  const createNewConversation = async () => {
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'bot',
      message: profile 
        ? "Hi, how can I help you today?"
        : "Hello! I'm MedBuddy AI, your personal health assistant. Please select a profile first to get personalized health assistance.",
      timestamp: new Date()
    };

    const newConversation: ChatConversation = {
      id: 'main-conversation',
      title: 'Chat with MedBuddy',
      messages: [welcomeMessage],
      created_at: new Date(),
      updated_at: new Date()
    };

    // Save welcome message to database
    try {
      if (profile) {
        await supabase.from('ai_conversations').insert({
          profile_id: profile.id,
          message: welcomeMessage.message,
          sender: 'bot'
        });
      }
    } catch (error) {
      console.error('Error saving welcome message:', error);
    }

    setConversations([newConversation]);
    setActiveConversation(newConversation);
    setShowSidebar(false);
  };

  // Send message
  const sendMessage = async (messageText: string) => {
    if (!activeConversation || !profile) return;

    setLoading(true);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: messageText,
      timestamp: new Date()
    };

    const updatedConversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, userMessage],
      title: activeConversation.messages.length === 0 ? messageText.substring(0, 30) + '...' : activeConversation.title,
      updated_at: new Date()
    };

    setActiveConversation(updatedConversation);
    setConversations(prev => 
      prev.map(conv => 
        conv.id === updatedConversation.id ? updatedConversation : conv
      )
    );

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Send to AI backend
      const res = await fetch('http://172.20.10.3:3001/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          profile_id: profile.id,
          message: messageText 
        }),
      });

      const json = await res.json();
      
      if (json.error) {
        throw new Error(json.error);
      }

      // Add bot response
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        message: json.response,
        timestamp: new Date()
      };

      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, botMessage],
        updated_at: new Date()
      };

      setActiveConversation(finalConversation);
      setConversations(prev => 
        prev.map(conv => 
          conv.id === finalConversation.id ? finalConversation : conv
        )
      );

                    // Save both user and bot messages to database
        if (profile) {
          // Save user message
          await supabase.from('ai_conversations').insert({
            profile_id: profile.id,
            message: messageText,
            sender: 'user'
          });

          // Save bot message
          await supabase.from('ai_conversations').insert({
            profile_id: profile.id,
            message: json.response,
            sender: 'bot'
          });
        }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        message: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      };

      const errorConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, errorMessage],
        updated_at: new Date()
      };

      setActiveConversation(errorConversation);
      setConversations(prev => 
        prev.map(conv => 
          conv.id === errorConversation.id ? errorConversation : conv
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    // Show confirmation dialog
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!profile) return;

              // Remove all messages for this profile from database
              await supabase
                .from('ai_conversations')
                .delete()
                .eq('profile_id', profile.id);

              // Remove from state
              setConversations([]);
              setActiveConversation(null);
            } catch (error) {
              console.error('Error deleting conversation:', error);
            }
          }
        }
      ]
    );
  };

  // Load conversations on mount and when profile changes
  useEffect(() => {
    loadConversations();
  }, [profile]);

  // Show loading state
  if (profileLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="Chat" onMenuPress={() => setShowSidebar(true)} />
      
      {!profile ? (
        // No profile selected
        <View style={styles.noProfileContainer}>
          <Ionicons name="person-circle-outline" size={64} color={COLORS.gray} />
          <Text style={styles.noProfileText}>No profile selected</Text>
          <Text style={styles.noProfileSubtext}>
            Please create or select a profile in the Profile tab to start chatting.
          </Text>
        </View>
             ) : activeConversation ? (
         // Active conversation view
         <KeyboardAvoidingView 
           style={styles.chatView} 
           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
           keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
         >
           {/* Chat messages */}
           <FlatList
             ref={flatListRef}
             data={activeConversation.messages}
             keyExtractor={(item) => item.id}
             renderItem={({ item }) => <ChatMessage message={item} profile={profile} />}
             style={styles.messagesList}
             contentContainerStyle={styles.messagesContainer}
             inverted={false}
             showsVerticalScrollIndicator={false}
             onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
             onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
           />
           
           {/* Chat input */}
           <ChatInput 
             onSend={sendMessage} 
             loading={loading} 
             disabled={saving}
           />
         </KeyboardAvoidingView>
      ) : (
        // Welcome screen
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeContent}>
            <Ionicons name="chatbubbles-outline" size={80} color={COLORS.primary} />
            <Text style={styles.welcomeTitle}>MedBuddy AI Assistant</Text>
            <Text style={styles.welcomeSubtitle}>
              Chat with {profile.name}'s personal health assistant
            </Text>
            
            <TouchableOpacity 
              style={styles.startChatButton}
              onPress={createNewConversation}
            >
              <Ionicons name="add" size={24} color={COLORS.white} />
              <Text style={styles.startChatButtonText}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Chat history sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onSelectConversation={(id) => {
          const conversation = conversations.find(conv => conv.id === id);
          if (conversation) {
            setActiveConversation(conversation);
            setShowSidebar(false);
          }
        }}
        onNewChat={createNewConversation}
        onDeleteConversation={deleteConversation}
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  noProfileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginTop: 16,
    marginBottom: 8,
  },
  noProfileSubtext: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startChatButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  chatView: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  userAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userMessageBubble: {
    backgroundColor: COLORS.primary,
  },
  botMessageBubble: {
    backgroundColor: COLORS.lightGray,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: COLORS.white,
  },
  botMessageText: {
    color: COLORS.darkGray,
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    opacity: 0.7,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: COLORS.sidebarBg,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  sidebarHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sidebarNewChatButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHistoryList: {
    flex: 1,
  },
  chatHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  activeChatHistoryItem: {
    backgroundColor: COLORS.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  chatHistoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHistoryText: {
    marginLeft: 12,
    flex: 1,
  },
  chatHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 2,
  },
  activeChatHistoryTitle: {
    color: COLORS.primary,
  },
  chatHistoryDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
}); 