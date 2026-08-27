import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, FlatList, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/ProfileContext';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../lib/config';
import { Fonts } from '../../constants/Fonts';

const COLORS = {
  primary: '#25D366',
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

const TEXT_COLOR = '#011A05';
const LIGHT_BACKGROUND = 'rgba(240, 249, 244, 0.95)';
const SHADOW_COLOR = '#25D366';

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
          color={TEXT_COLOR} 
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
        <Ionicons name="checkmark-circle" size={16} color={TEXT_COLOR} />
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
                <Ionicons name="add" size={24} color={TEXT_COLOR} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.sidebarCloseButton}>
                <Ionicons name="close" size={24} color={TEXT_COLOR} />
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
                <Ionicons name="chatbubbles-outline" size={48} color={TEXT_COLOR} />
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
        placeholderTextColor={TEXT_COLOR}
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
      const { data: messages, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true })
        .limit(100); // Limit to recent conversation history

      if (error) {
        console.error('Error loading conversations:', error);
      }

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
        // No history — start a fresh conversation automatically
        await createNewConversation();
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
    if (!profile) {
      Alert.alert('No profile', 'Please select a profile before chatting.');
      return;
    }

    let conversation = activeConversation;
    if (!conversation) {
      await createNewConversation();
      conversation = {
        id: 'main-conversation',
        title: 'Chat with MedBuddy',
        messages: [],
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    setLoading(true);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: messageText,
      timestamp: new Date()
    };

    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, userMessage],
      title: conversation.messages.length === 0 ? messageText.substring(0, 30) + '...' : conversation.title,
      updated_at: new Date()
    };

    setActiveConversation(updatedConversation);
    setConversations(prev => {
      const exists = prev.some(conv => conv.id === updatedConversation.id);
      if (!exists) return [updatedConversation];
      return prev.map(conv => 
        conv.id === updatedConversation.id ? updatedConversation : conv
      );
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Build request URL and payload
      const apiUrl = `${BACKEND_URL}/api/ai-chat`;
      const requestPayload = { 
        user_id: user.id, 
        profile_id: profile.id,
        message: messageText 
      };

      // Log request details for debugging
      console.log('=== AI Chat Request ===');
      console.log('Backend URL:', BACKEND_URL);
      console.log('Full API URL:', apiUrl);
      console.log('Request Method: POST');
      console.log('Request Payload:', {
        user_id: requestPayload.user_id,
        profile_id: requestPayload.profile_id,
        message_length: requestPayload.message.length
      });
      console.log('========================');

      // Send to AI backend
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      // Log response details
      console.log('=== AI Chat Response ===');
      console.log('Status:', res.status);
      console.log('Status Text:', res.statusText);
      console.log('Response OK:', res.ok);
      console.log('========================');

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      console.log('Response Data:', { hasResponse: !!json.response, responseLength: json.response?.length || 0 });
      
      if (json.error) {
        console.error('API returned error:', json.error);
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
      // Messages are persisted by the backend /api/ai-chat route

    } catch (error) {
      console.error('=== AI Chat Error ===');
      console.error('Error sending message:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Backend URL used:', BACKEND_URL);
      console.error('Full API URL:', `${BACKEND_URL}/api/ai-chat`);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error - Check if backend URL is correct and accessible');
        console.error('Troubleshooting: Verify BACKEND_URL in lib/config.ts');
      }
      console.error('=====================');
      
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

  // Log backend URL configuration on mount
  useEffect(() => {
    console.log('=== Chat Component Initialized ===');
    console.log('Backend URL configured:', BACKEND_URL);
    console.log('Environment:', __DEV__ ? 'development' : 'production');
    console.log('===================================');
  }, []);

  // Load conversations on mount and when profile changes
  useEffect(() => {
    if (!profile) return;
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
    letterSpacing: 1,
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.bold,
  },
  noProfileSubtext: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Fonts.regular,
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
    fontFamily: Fonts.bold,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: Fonts.regular,
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
    fontFamily: Fonts.bold,
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
    backgroundColor: LIGHT_BACKGROUND,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.regular,
  },
  userMessageText: {
    color: TEXT_COLOR,
  },
  botMessageText: {
    color: TEXT_COLOR,
  },
  messageTime: {
    fontSize: 12,
    color: TEXT_COLOR,
    marginTop: 4,
    opacity: 0.7,
    fontFamily: Fonts.regular,
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
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    fontFamily: Fonts.regular,
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
    backgroundColor: LIGHT_BACKGROUND,
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
    fontFamily: Fonts.bold,
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
    padding: 16,
  },
  chatHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BACKGROUND,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  activeChatHistoryItem: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: TEXT_COLOR + '30',
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
    color: TEXT_COLOR,
    marginBottom: 2,
    fontFamily: Fonts.semiBold,
  },
  activeChatHistoryTitle: {
    color: TEXT_COLOR,
  },
  chatHistoryDate: {
    fontSize: 12,
    color: TEXT_COLOR,
    fontFamily: Fonts.regular,
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
    color: TEXT_COLOR,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Fonts.bold,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: TEXT_COLOR,
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },
}); 