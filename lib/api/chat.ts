import { ApiResponse, createSuccessResponse, simulateDelay } from './client';
import { Conversation, ChatMessage } from '../types';
import { mockConversations, mockInitialMessages, mockIdCardProcedure, mockLocations } from '../mock-data';

export const chatApi = {
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return createSuccessResponse<Conversation[]>(mockConversations);
  },

  async getMessages(conversationId: string): Promise<ApiResponse<ChatMessage[]>> {
    const messages = mockInitialMessages[conversationId] || [];
    return createSuccessResponse<ChatMessage[]>(messages);
  },

  async sendMessage(conversationId: string, content: string): Promise<ApiResponse<ChatMessage>> {
    await simulateDelay(600);

    const lower = content.toLowerCase();
    let structuredData: ChatMessage['structuredData'];
    let replyText = "I have noted your inquiry and cross-referenced with the verified community knowledge base.";

    if (lower.includes('id') || lower.includes('lost') || lower.includes('card')) {
      replyText = "I found the verified official procedure for Student ID Replacement. Here are the steps, required documentation, and office hours.";
      structuredData = {
        type: 'procedure',
        procedure: mockIdCardProcedure,
        location: mockLocations[0],
      };
    } else if (lower.includes('quantum') || lower.includes('lab')) {
      replyText = "The Quantum Computing & Information Lab is located in the Silver Jubilee Tower on Floor 3.";
      structuredData = {
        type: 'location',
        location: mockLocations[2],
      };
    } else if (lower.includes('library') || lower.includes('book')) {
      replyText = "The Nexora Central Library is currently open 24/7 during the active examination cycle.";
      structuredData = {
        type: 'location',
        location: mockLocations[1],
      };
    }

    const aiMessage: ChatMessage = {
      id: `msg_resp_${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
      structuredData,
      sources: [
        {
          id: `src_${Date.now()}`,
          title: 'Nexora Official Community Directive 2026',
          sourceDocument: 'Campus Policy & Operations Handbook',
          pageOrSection: 'Section 3.1',
          confidenceScore: 0.96,
          verifiedAt: '2026-08-20',
        },
      ],
    };

    return {
      data: aiMessage,
      error: null,
      status: 200,
    };
  },

  async createConversation(firstMessage: string): Promise<ApiResponse<Conversation>> {
    await simulateDelay(200);
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: firstMessage.slice(0, 32) + (firstMessage.length > 32 ? '...' : ''),
      lastMessage: firstMessage,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tags: ['General Query'],
    };
    return {
      data: newConv,
      error: null,
      status: 201,
    };
  },
};
