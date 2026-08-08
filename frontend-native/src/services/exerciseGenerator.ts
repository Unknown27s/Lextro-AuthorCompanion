/**
 * Exercise Generator
 *
 * Ported from web version — the only change is importing axios which
 * works identically in React Native (Expo bundles fetch + axios).
 */

import axios from 'axios';

export interface MissingWord {
  blank_number: number;
  word: string;
  hint: string;
  position: number;
}

export interface WritingExercise {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  paragraph_original: string;
  paragraph_with_blanks: string;
  missing_words: MissingWord[];
  topic: string;
  created_at: string;
}

const PARAGRAPH_TEMPLATES = {
  easy: [
    'Every morning, Sarah walked through the park near her home. The trees were very green, and birds sang their songs. She loved to watch the butterflies dancing in the breeze. Today was special because she found a beautiful stone by the path. She decided to keep it as a memory of this wonderful day.',
    'The old bookstore was my favorite place to visit. I could spend hours reading stories about distant lands. The owner, Mr. Chen, always had a warm smile for me. He would recommend books that matched my interests perfectly. One day, he told me about a rare book that had just arrived.',
    'During the summer vacation, Tom decided to learn how to swim. His uncle taught him in the community pool every afternoon. At first, he was afraid of the water, but soon he became confident. By the end of summer, he could swim across the entire pool. His family was very proud of his achievement.',
    'The small town had a traditional market every Saturday morning. Vendors sold fresh vegetables, fruits, and handmade items. Children ran between stalls looking for toys and candies. The air was filled with happy chatter and the smell of fresh bread. It was a place where everyone knew each other.',
    'Lisa was preparing for her final exam in biology. She studied the chapters carefully and made detailed notes. Her teacher had given her practice questions to solve. With hard work and dedication, she felt ready for the test. She was confident that she would do well.',
  ],
  medium: [
    'The ancient manuscript lay hidden in the basement archives for decades. Historians eventually discovered its significance in understanding medieval commerce. The intricate calligraphy revealed details about trade routes and merchant guilds. Scholars meticulously analyzed every page to extract valuable information. This discovery fundamentally altered our perception of economic history during that era.',
    'Environmental conservation has become increasingly crucial in contemporary society. Numerous organizations collaborate to preserve endangered ecosystems and wildlife. Their initiatives include reforestation projects and marine protection programs. Communities actively participate in sustainability efforts through various campaigns. These collective actions demonstrate how collaboration can combat environmental degradation effectively.',
    'The startup company revolutionized the technology sector with innovative solutions. Their prototype demonstrated unprecedented efficiency compared to existing alternatives. Investment firms recognized the potential and provided substantial funding. Within three years, they expanded their operations internationally. Their success inspired numerous entrepreneurs to pursue similar ventures.',
    'Traditional artisans in rural villages preserved centuries-old crafting techniques. Young apprentices learned these intricate skills through patient mentorship. The government initiated programs to sustain these cultural heritage practices. International markets gradually recognized the quality and authenticity of handmade products. This revival generated sustainable income for rural communities.',
    'Climate patterns have shifted noticeably across various geographic regions. Scientific research attributed these changes to anthropogenic factors primarily. Agricultural yields fluctuated significantly affecting food security globally. Governments implemented comprehensive strategies to mitigate climate-related impacts. Technological innovations emerged as potential solutions to these pressing challenges.',
  ],
  hard: [
    'The epistemological implications of quantum mechanics fundamentally challenged Cartesian dualism. Heisenberg\'s uncertainty principle introduced indeterminacy into previously deterministic frameworks. Contemporary physicists grapple with the philosophical ramifications of non-local phenomena. This paradigm shift necessitates reconceptualizing fundamental assumptions about causality and observation. The intersection of physics and metaphysics remains contentious among theoreticians.',
    'Postmodern literary criticism deconstructs normative interpretive methodologies through rigorous textual analysis. Intertextuality permeates contemporary narratives, creating polyphonic semantic networks. Derrida\'s concept of différance illuminates the instability of linguistic signification. These theoretical frameworks problematize conventional hermeneutic approaches. Ultimately, meaning emerges as contingent and performatively constituted through discourse.',
    'Neoliberal economic policies precipitated unprecedented wealth stratification and systemic inequality. Financialization exacerbated structural vulnerabilities within global markets. Macroeconomic instability prompted governmental interventions and regulatory mechanisms. Stakeholders debated whether orthodox or heterodox approaches proved more efficacious. Socioeconomic ramifications continued reverberating through demographic stratifications.',
    'Phenomenological analysis elucidates consciousness through systematic introspection and bracketing methodologies. Husserl\'s transcendental approach interrogates the intentionality underlying perception. Embodied cognition research challenges Cartesian mind-body dichotomies fundamentally. Experiential modalities constitute intersubjective meaning-making processes. Hermeneutical phenomenology continues generating philosophical discourse.',
    'Biomolecular pathways regulate cellular differentiation through epigenetic mechanisms and transcriptional regulation. Telomere attrition correlates with senescence, affecting organismal longevity substantially. Mitochondrial dysfunction contributes to neurodegenerative pathologies through oxidative stress. CRISPR-Cas9 technologies enable unprecedented genomic engineering capabilities. These discoveries augment our comprehension of cellular biology and regenerative medicine.',
  ],
};

const IMPORTANT_WORD_PATTERNS = {
  easy: {
    minLength: 4,
    maxLength: 12,
    partOfSpeech: ['NOUN', 'VERB', 'ADJ'] as const,
    commonWords: [
      'morning', 'walked', 'park', 'trees', 'green', 'birds', 'sang',
      'loved', 'watched', 'dancing', 'breeze', 'special', 'found',
      'beautiful', 'stone', 'path', 'decided', 'keep', 'memory', 'wonderful',
    ],
  },
  medium: {
    minLength: 5,
    maxLength: 14,
    partOfSpeech: ['NOUN', 'VERB', 'ADJ', 'ADV'] as const,
    commonWords: [
      'discovered', 'significance', 'medieval', 'commerce', 'calligraphy',
      'merchants', 'scholars', 'analyzed', 'altered', 'perception',
    ],
  },
  hard: {
    minLength: 6,
    maxLength: 16,
    partOfSpeech: ['NOUN', 'VERB', 'ADJ', 'ADV'] as const,
    commonWords: [
      'epistemological', 'implications', 'challenged', 'uncertainty',
      'indeterminacy', 'phenomena', 'paradigm', 'causality', 'observation',
      'contentious',
    ],
  },
};

const DATAMUSE_API = 'https://api.datamuse.com/words';
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export const exerciseGenerator = {
  generateExercise: async (
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  ): Promise<WritingExercise> => {
    try {
      const paragraphs = PARAGRAPH_TEMPLATES[difficulty];
      const paragraph_original =
        paragraphs[Math.floor(Math.random() * paragraphs.length)];

      const importantWordData =
        await exerciseGenerator.extractImportantWords(
          paragraph_original,
          difficulty,
        );

      const { paragraph_with_blanks, missingWords } =
        exerciseGenerator.createBlanks(paragraph_original, importantWordData);

      const missing_words = await Promise.all(
        missingWords.map((mw, idx) =>
          exerciseGenerator.generateHint(mw.word).then((hint) => ({
            blank_number: idx + 1,
            word: mw.word,
            hint,
            position: mw.position,
          })),
        ),
      );

      return {
        id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        difficulty,
        paragraph_original,
        paragraph_with_blanks,
        missing_words,
        topic: exerciseGenerator.getTopic(),
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[exerciseGenerator] Failed to generate exercise:', error);
      throw error;
    }
  },

  extractImportantWords: async (
    paragraph: string,
    difficulty: 'easy' | 'medium' | 'hard',
  ): Promise<Array<{ word: string; position: number }>> => {
    const words = paragraph.split(/\s+/);
    const config = IMPORTANT_WORD_PATTERNS[difficulty];
    const commonWords = new Set(
      config.commonWords.map((w) => w.toLowerCase()),
    );
    const stopWords = new Set([
      'the', 'and', 'but', 'this', 'that', 'with', 'from', 'have',
      'been', 'were', 'was', 'for', 'her', 'his', 'their', 'they',
      'you', 'your', 'our', 'are', 'not', 'one', 'two', 'all',
      'any', 'can', 'had', 'she', 'him', 'its', 'into', 'than', 'then',
    ]);

    const importantWords: Array<{ word: string; position: number; score: number }> = [];

    for (let i = 0; i < words.length; i++) {
      const cleanWord = words[i].replace(/[.,!?;:—-]/g, '').toLowerCase();

      if (
        cleanWord.length >= config.minLength &&
        cleanWord.length <= config.maxLength &&
        !stopWords.has(cleanWord)
      ) {
        let score = 0;
        if (commonWords.has(cleanWord)) score += 3;
        if (cleanWord.length >= 8) score += 2;
        if (cleanWord.length >= 12) score += 2;
        if (/[A-Z]/.test(words[i][0] || '')) score += 1;

        importantWords.push({
          word: words[i].replace(/[.,!?;:—-]/g, ''),
          position: i,
          score,
        });
      }
    }

    if (importantWords.length < 3) {
      for (let i = 0; i < words.length; i++) {
        const cleanWord = words[i].replace(/[.,!?;:—-]/g, '').toLowerCase();
        if (cleanWord.length >= config.minLength && !stopWords.has(cleanWord)) {
          const alreadyIncluded = importantWords.some((item) => item.position === i);
          if (!alreadyIncluded) {
            importantWords.push({
              word: words[i].replace(/[.,!?;:—-]/g, ''),
              position: i,
              score: cleanWord.length >= 10 ? 2 : 1,
            });
          }
        }
      }
    }

    const count = Math.min(
      difficulty === 'easy' ? 5 : difficulty === 'medium' ? 6 : 7,
      importantWords.length,
    );

    return importantWords
      .sort((a, b) => b.score - a.score || a.position - b.position)
      .slice(0, count)
      .sort((a, b) => a.position - b.position);
  },

  createBlanks: (
    paragraph: string,
    wordsToRemove: Array<{ word: string; position: number }>,
  ): {
    paragraph_with_blanks: string;
    missingWords: Array<{ word: string; position: number }>;
  } => {
    let words = paragraph.split(/\s+/);
    const missingWords: Array<{ word: string; position: number }> = [];
    const positionsToReplace = new Set(
      wordsToRemove.map((w) => w.position),
    );

    words = words.map((word, idx) => {
      if (positionsToReplace.has(idx)) {
        const cleanWord = word.replace(/[.,!?;:—-]/g, '');
        missingWords.push({ word: cleanWord, position: idx });

        const punctuation = word.match(/[.,!?;:—-]+$/)?.[0] || '';
        return `____${punctuation}`;
      }
      return word;
    });

    return {
      paragraph_with_blanks: words.join(' '),
      missingWords,
    };
  },

  generateHint: async (word: string): Promise<string> => {
    try {
      const dictResponse = await axios.get(
        `${DICTIONARY_API}/${encodeURIComponent(word)}`,
        { timeout: 5000 },
      ).catch(() => null);

      if (dictResponse?.data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition) {
        return dictResponse.data[0].meanings[0].definitions[0].definition;
      }

      const datamouseResponse = await axios.get(
        `${DATAMUSE_API}?ml=${encodeURIComponent(word)}&max=1`,
        { timeout: 5000 },
      ).catch(() => null);

      if (datamouseResponse?.data?.[0]?.word) {
        return `synonym: ${datamouseResponse.data[0].word}`;
      }

      return `a word with ${word.length} letters`;
    } catch (error) {
      console.error(`[exerciseGenerator] Failed to generate hint for "${word}":`, error);
      return `word: ${word.charAt(0).toUpperCase()}${word.slice(1).replace(/./g, '_')}`;
    }
  },

  getTopic: (): string => {
    const topics = [
      'Story', 'Science', 'History', 'Nature', 'Culture',
      'Technology', 'Daily Life', 'Adventure',
    ];
    return topics[Math.floor(Math.random() * topics.length)];
  },

  validateAnswer: (userAnswer: string, correctAnswer: string): boolean => {
    return (
      userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    );
  },

  getFeedback: (
    userAnswer: string,
    correctAnswer: string,
    isCorrect: boolean,
  ): string => {
    if (isCorrect) {
      return `✓ Correct! "${correctAnswer}" is the right word.`;
    }
    return `✗ Not quite. The answer is "${correctAnswer}", but you wrote "${userAnswer}". Try again!`;
  },
};
