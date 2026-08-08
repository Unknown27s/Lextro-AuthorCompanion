/**
 * Shared type definitions for the Lextro app.
 * Canonical types live here to avoid the duplicate VocabItem interface
 * that existed in both api/client.ts and store/feedSlice.ts.
 */

export interface VocabItem {
  id: string;
  word: string;
  pos: string;
  difficulty: 'easy' | 'medium' | 'hard';
  definition: string;
  example_corpus: string;
  ai_example: string;
  synonyms: string[];
  antonyms?: string[];
  relatedWords?: string[];
  tags: string[];
  created_at: string;
  // Word tracking metadata
  isTracked?: boolean;
  duplicateOf?: string;
  similarMeanings?: string[];
}

export interface FeedResponse {
  items: VocabItem[];
  nextCursor: string | null;
}

export interface User {
  id: string;
  name: string;
  password: string;
  createdAt: number;
  lastLogin: number;
  learningPurpose?: 'writing' | 'interviews' | 'exams' | 'presentation' | 'creative';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
}

export interface UserVocabItem {
  id: string;
  vocab_item_id: string;
  vocab_item: VocabItem;
  status: 'saved' | 'learning' | 'mastered';
  practice_score: number;
  added_at: string;
}
