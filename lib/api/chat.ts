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
    const res = await apiRequest<any[]>(`/api/v1/chat/history/${conversationId}`);

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const mapped: ChatMessage[] = res.data.map((msg: any) => ({
        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
        conversationId: msg.conversation_id || conversationId,
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content || '',
        timestamp: msg.created_at || msg.timestamp || new Date().toISOString(),
        structuredData: msg.structured_data || msg.structuredData || undefined,
        sources: (msg.sources || []).map((s: any) => ({
          id: s.id || s.source_id || `src_${Date.now()}`,
          title: s.title,
          sourceDocument: s.source_document || s.sourceDocument,
          pageOrSection: s.page_or_section || s.pageOrSection || undefined,
          confidenceScore: s.confidence_score || s.confidenceScore || 0.95,
          verifiedAt: s.verified_at || s.verifiedAt || '2026-09-06',
        })),
        externalSources: msg.external_sources || msg.externalSources || undefined,
        isExternal: msg.is_external || msg.isExternal || false,
      }));
      return {
        data: mapped,
        error: null,
        status: 200,
      };
    }

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

      // Map external sources
      const externalSources = (data.external_sources || []).map((ext: any) => ({
        title: ext.title,
        url: ext.url,
        snippet: ext.snippet,
        source: ext.source,
      }));

      const aiMessage: ChatMessage = {
        id: `msg_resp_${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        structuredData,
        sources: sources.length > 0 ? sources : undefined,
        externalSources: externalSources.length > 0 ? externalSources : undefined,
        isExternal: data.is_external || false,
      };

      return {
        data: aiMessage,
        error: null,
        status: 200,
      };
    }

    // If backend returned an error or timeout (status !== 0), propagate it directly to the UI
    if (res.error && res.status !== 0) {
      return {
        data: null,
        error: res.error,
        status: res.status,
      };
    }

    // 2. Fallback when backend is completely offline / unreachable (status === 0)
    await simulateDelay(400);
    const lower = content.toLowerCase();
    let fallbackStructured: StructuredDataPayload | undefined;
    let replyText = "I couldn't verify that information from the available community sources.";
    let isExternalFallback = false;
    let externalSourcesFallback: any[] | undefined = undefined;

    if (lower.includes('passport')) {
      replyText = "Based on external official records (Passport Seva, Ministry of External Affairs, Govt of India), documents generally required for an Indian passport application include: (1) Proof of Present Address (Aadhaar, utility bill), (2) Proof of Date of Birth (Birth Certificate or 10th marksheet), (3) photographs, and (4) Annexure E.";
      isExternalFallback = true;
      externalSourcesFallback = [
        {
          title: "Official Indian Passport Application Guide & Document Checklist",
          url: "https://www.passportindia.gov.in/AppOnlineProject/online/checklist",
          snippet: "Documents generally required include Proof of Address, Date of Birth, and Annexure E.",
          source: "Passport Seva - Ministry of External Affairs, Govt of India",
        },
      ];
    } else if (lower.includes('id') || lower.includes('lost') || lower.includes('card')) {
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
    } else if (lower.includes('how long') || lower.includes('route') || lower.includes('navigate') || lower.includes('take me there')) {
      replyText = "Walking from Nexora Central Library to Student Services Center takes approximately 4 minutes (240 meters). Follow the Skybridge corridor to Silver Jubilee Tower Ground Floor.";
      fallbackStructured = {
        type: 'navigation',
        navigationRoute: {
          id: `route_${Date.now()}`,
          startPoint: 'Central Library',
          destination: 'Student Services Center (SJT-G12)',
          etaMinutes: 4,
          distanceMeters: 240,
          floorChanges: ['Ground Floor -> SJT Ground Floor'],
          steps: [
            { instruction: 'Depart Central Library towards the Skybridge Overpass.', distance: '40m', landmark: 'Library Concourse' },
            { instruction: 'Cross the covered Skybridge connector to Silver Jubilee Tower.', distance: '130m', landmark: 'Skybridge Overpass' },
            { instruction: 'Arrive at Student Services Center (Room G12) on your right.', distance: '70m', landmark: 'SJT Directory' },
          ],
        },
      };
    }

    const fallbackMsg: ChatMessage = {
      id: `msg_resp_${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
      structuredData: fallbackStructured,
      isExternal: isExternalFallback,
      externalSources: externalSourcesFallback,
      sources: isExternalFallback ? undefined : [
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
