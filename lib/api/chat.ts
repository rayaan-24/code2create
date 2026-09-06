import { apiRequest, ApiResponse, createSuccessResponse, simulateDelay } from './client';
import { Conversation, ChatMessage, SourceItem, StructuredDataPayload } from '../types';
import { mockConversations, mockInitialMessages, mockIdCardProcedure, mockLocations } from '../mock-data';

export const chatApi = {
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    // Attempt to load from real backend
    const res = await apiRequest<any[]>('/api/v1/chat/history');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const mapped: Conversation[] = res.data.map((s) => ({
        id: s.id,
        title: s.title,
        lastMessage: 'Active conversation',
        updatedAt: s.updated_at,
        createdAt: s.created_at,
        tags: ['Community AI'],
      }));
      return { data: mapped, error: null, status: 200 };
    }

    return createSuccessResponse<Conversation[]>(mockConversations);
  },

  async getMessages(conversationId: string): Promise<ApiResponse<ChatMessage[]>> {
    const messages = mockInitialMessages[conversationId] || [];
    return createSuccessResponse<ChatMessage[]>(messages);
  },

  async sendMessage(
    conversationId: string,
    content: string,
    debugMode: boolean = false
  ): Promise<ApiResponse<ChatMessage>> {
    // 1. Call real FastAPI /api/v1/chat endpoint
    const res = await apiRequest<any>('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: content,
        conversation_id: conversationId,
        debug_mode: debugMode,
      }),
    });

    if (res.data && res.data.answer) {
      const data = res.data;

      // Map backend sources to frontend SourceItem[]
      const sources: SourceItem[] = (data.sources || []).map((s: any) => ({
        id: s.source_id,
        title: s.title,
        sourceDocument: s.source_document,
        pageOrSection: s.page_or_section || undefined,
        confidenceScore: s.confidence_score || 0.95,
        verifiedAt: s.verified_at || '2026-09-06',
      }));

      // Map structured_card to frontend StructuredDataPayload
      let structuredData: StructuredDataPayload | undefined;
      if (data.structured_card) {
        structuredData = data.structured_card as StructuredDataPayload;
      }

      const aiMessage: ChatMessage = {
        id: `msg_resp_${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        structuredData,
        sources: sources.length > 0 ? sources : undefined,
      };

      return {
        data: aiMessage,
        error: null,
        status: 200,
      };
    }

    // 2. Fallback when backend is unreachable
    await simulateDelay(400);
    const lower = content.toLowerCase();
    let fallbackStructured: StructuredDataPayload | undefined;
    let replyText = "I couldn't verify that information from the available community sources.";

    if (lower.includes('id') || lower.includes('lost') || lower.includes('card')) {
      replyText = "I found the verified official procedure for Student ID Replacement. Here are the steps, required documentation, and office hours.";
      fallbackStructured = {
        type: 'procedure',
        procedure: mockIdCardProcedure,
        location: mockLocations[0],
      };
    } else if (lower.includes('where is') || lower.includes('office') || lower.includes('location')) {
      replyText = "The Student Services Center is located in the Silver Jubilee Tower (SJT) on the Ground Floor, Room G12.";
      fallbackStructured = {
        type: 'location',
        location: mockLocations[0],
      };
    } else if (lower.includes('how long') || lower.includes('route') || lower.includes('navigate')) {
      replyText = "Walking from Nexora Central Library to Student Services Center takes approximately 4 minutes (280 meters).";
    }

    const fallbackMsg: ChatMessage = {
      id: `msg_resp_${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
      structuredData: fallbackStructured,
      sources: [
        {
          id: `src_${Date.now()}`,
          title: 'Nexora Official Community Handbook 2026',
          sourceDocument: 'Campus Registry Verified Repository',
          pageOrSection: 'Section 4.2',
          confidenceScore: 0.98,
          verifiedAt: '2026-08-15',
        },
      ],
    };

    return {
      data: fallbackMsg,
      error: null,
      status: 200,
    };
  },

  async createConversation(firstMessage: string): Promise<ApiResponse<Conversation>> {
    await simulateDelay(150);
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
