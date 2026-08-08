/**
 * Author Guess — curated public-domain quote dataset.
 *
 * The on-device data layer has no author attribution (Wordnik examples carry
 * only text/title/url), so Author Guess pulls from this small bundled set of
 * well-known public-domain quotations. Authors repeat across quotes so
 * distractors stay plausible.
 */

export interface AuthorQuote {
  id: string;
  quote: string;
  author: string;
}

export const authorQuotes: AuthorQuote[] = [
  {
    id: 'aq_01',
    quote: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
    author: 'Charles Dickens',
  },
  {
    id: 'aq_02',
    quote: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    author: 'Jane Austen',
  },
  {
    id: 'aq_03',
    quote: 'That which we call a rose by any other name would smell as sweet.',
    author: 'William Shakespeare',
  },
  {
    id: 'aq_04',
    quote: 'Hope is the thing with feathers that perches in the soul.',
    author: 'Emily Dickinson',
  },
  {
    id: 'aq_05',
    quote: 'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.',
    author: 'Ralph Waldo Emerson',
  },
  {
    id: 'aq_06',
    quote: 'Whatever you are, be a good one.',
    author: 'Abraham Lincoln',
  },
  {
    id: 'aq_07',
    quote: 'I have not failed. I have just found 10,000 ways that will not work.',
    author: 'Thomas Edison',
  },
  {
    id: 'aq_08',
    quote: 'All our dreams can come true, if we have the courage to pursue them.',
    author: 'Walt Disney',
  },
  {
    id: 'aq_09',
    quote: 'Simplicity is the ultimate sophistication.',
    author: 'Leonardo da Vinci',
  },
  {
    id: 'aq_10',
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
  },
  {
    id: 'aq_11',
    quote: 'It always seems impossible until it is done.',
    author: 'Nelson Mandela',
  },
  {
    id: 'aq_12',
    quote: 'The only thing we have to fear is fear itself.',
    author: 'Franklin D. Roosevelt',
  },
  {
    id: 'aq_13',
    quote: 'Whether you think you can or you think you can\u2019t, you\u2019re right.',
    author: 'Henry Ford',
  },
  {
    id: 'aq_14',
    quote: 'In the middle of difficulty lies opportunity.',
    author: 'Albert Einstein',
  },
  {
    id: 'aq_15',
    quote: 'The best way to find yourself is to lose yourself in the service of others.',
    author: 'Mahatma Gandhi',
  },
  {
    id: 'aq_16',
    quote: 'Well done is better than well said.',
    author: 'Benjamin Franklin',
  },
  {
    id: 'aq_17',
    quote: 'A person who never made a mistake never tried anything new.',
    author: 'Albert Einstein',
  },
  {
    id: 'aq_18',
    quote: 'Do not go where the path may lead, go instead where there is no path and leave a trail.',
    author: 'Ralph Waldo Emerson',
  },
  {
    id: 'aq_19',
    quote: 'The journey of a thousand miles begins with a single step.',
    author: 'Lao Tzu',
  },
  {
    id: 'aq_20',
    quote: 'Happiness is not something ready made. It comes from your own actions.',
    author: 'Dalai Lama',
  },
];

export const authorNames: string[] = Array.from(
  new Set(authorQuotes.map((q) => q.author)),
);
