import JSZip from 'jszip';
import {
  WORDS_PER_PAGE,
  stripGutenbergBoilerplate,
  splitIntoChapters,
  paginateChapters,
  buildChapterIndex,
  parseTxt,
  parseEpub,
  htmlToText,
  decodeEntities,
} from '../bookParser';

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('stripGutenbergBoilerplate', () => {
  it('removes text before START and after END markers', () => {
    const raw = [
      'Header junk that should vanish.',
      '*** START OF THE PROJECT GUTENBERG EBOOK MOBY DICK ***',
      'Call me Ishmael.',
      '*** END OF THE PROJECT GUTENBERG EBOOK MOBY DICK ***',
      'Licence junk that should vanish.',
    ].join('\n');
    const out = stripGutenbergBoilerplate(raw);
    expect(out).toContain('Call me Ishmael.');
    expect(out).not.toContain('Header junk');
    expect(out).not.toContain('Licence junk');
  });

  it('returns input unchanged when markers are absent', () => {
    expect(stripGutenbergBoilerplate('plain text')).toBe('plain text');
  });
});

describe('splitIntoChapters', () => {
  it('splits on CHAPTER headings', () => {
    const raw = 'CHAPTER I\nFirst part.\nCHAPTER II\nSecond part.';
    const chapters = splitIntoChapters(raw);
    expect(chapters.map((c) => c.title)).toEqual(['CHAPTER I', 'CHAPTER II']);
    expect(chapters[0].text).toBe('First part.');
  });

  it('falls back to a single TEXT chapter when no headings exist', () => {
    const chapters = splitIntoChapters('just some prose with no headings');
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe('TEXT');
  });

  it('splits on bare upper-case title lines', () => {
    const raw = [
      'STORY OF THE DOOR',
      'Mr. Utterson the lawyer was a man of a rugged countenance.',
      '',
      'SEARCH FOR MR. HYDE',
      'That evening Mr. Utterson came home from the office.',
    ].join('\n');
    const chapters = splitIntoChapters(raw);
    expect(chapters.map((c) => c.title)).toEqual(['STORY OF THE DOOR', 'SEARCH FOR MR. HYDE']);
    expect(chapters[0].text).toContain('rugged countenance');
  });

  it('ignores a table of contents that repeats the chapter titles', () => {
    const raw = [
      'Contents',
      '',
      ' STORY OF THE DOOR',
      '',
      ' SEARCH FOR MR. HYDE',
      '',
      'STORY OF THE DOOR',
      'Mr. Utterson the lawyer was a man of a rugged countenance.',
      '',
      'SEARCH FOR MR. HYDE',
      'That evening Mr. Utterson came home from the office.',
    ].join('\n');
    const chapters = splitIntoChapters(raw);
    expect(chapters.map((c) => c.title)).toEqual([
      'TEXT',
      'STORY OF THE DOOR',
      'SEARCH FOR MR. HYDE',
    ]);
    expect(chapters[0].text).toBe('Contents');
  });
});

describe('paginateChapters', () => {
  it('keeps single-character words in the rendered page text', () => {
    const pages = paginateChapters('b1', [{ title: 'TEXT', text: 'I am a & b' }]);
    expect(pages[0].text).toBe('I am a & b');
  });

  it('paginates in deterministic WORDS_PER_PAGE chunks', () => {
    const pages = paginateChapters('b1', [{ title: 'TEXT', text: words(WORDS_PER_PAGE * 2 + 5) }]);
    expect(pages).toHaveLength(3);
    expect(pages[0].wordCount).toBe(WORDS_PER_PAGE);
    expect(pages[1].wordCount).toBe(WORDS_PER_PAGE);
    expect(pages[2].wordCount).toBe(5);
    expect(pages.map((p) => p.index)).toEqual([0, 1, 2]);
  });

  it('is deterministic for identical input', () => {
    const raw = words(500);
    const a = paginateChapters('b1', [{ title: 'TEXT', text: raw }]);
    const b = paginateChapters('b1', [{ title: 'TEXT', text: raw }]);
    expect(a).toEqual(b);
  });

  it('tags pages with their chapter index and title', () => {
    const pages = paginateChapters('b1', [
      { title: 'CHAPTER I', text: words(10) },
      { title: 'CHAPTER II', text: words(10) },
    ]);
    expect(pages[0]).toMatchObject({ chapterIndex: 0, chapterTitle: 'CHAPTER I' });
    expect(pages[1]).toMatchObject({ chapterIndex: 1, chapterTitle: 'CHAPTER II' });
  });
});

describe('buildChapterIndex', () => {
  it('records startPage and pageCount per chapter', () => {
    const pages = paginateChapters('b1', [
      { title: 'CHAPTER I', text: words(WORDS_PER_PAGE * 2) },
      { title: 'CHAPTER II', text: words(30) },
    ]);
    const chapters = buildChapterIndex(pages);
    expect(chapters).toEqual([
      { index: 0, title: 'CHAPTER I', startPage: 0, pageCount: 2 },
      { index: 1, title: 'CHAPTER II', startPage: 2, pageCount: 1 },
    ]);
  });
});

describe('parseTxt', () => {
  it('returns pages and chapters together', () => {
    const result = parseTxt('b1', 'CHAPTER I\n' + words(300));
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.chapters.length).toBe(1);
  });
});

describe('decodeEntities', () => {
  it('decodes named entities', () => {
    expect(decodeEntities('a &amp; b &mdash; c')).toBe('a & b \u2014 c');
  });

  it('decodes decimal and hex numeric entities', () => {
    expect(decodeEntities('&#65;&#x42;')).toBe('AB');
  });

  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&notaRealOne;')).toBe('&notaRealOne;');
  });
});

describe('htmlToText', () => {
  it('strips tags and head/script/style content', () => {
    const html =
      '<html><head><style>p{color:red}</style></head><body><h1>Title</h1><p>Hello world.</p></body></html>';
    const text = htmlToText(html);
    expect(text).toBe('Title\nHello world.');
    expect(text).not.toContain('color:red');
  });

  it('turns <br> and block closers into line breaks', () => {
    expect(htmlToText('<p>one</p><p>two</p>')).toBe('one\ntwo');
    expect(htmlToText('a<br/>b')).toBe('a\nb');
  });
});

async function buildEpub(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0"><rootfiles>' +
      '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>' +
      '</rootfiles></container>',
  );
  zip.file(
    'OEBPS/content.opf',
    '<?xml version="1.0"?><package version="2.0"><manifest>' +
      '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>' +
      '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>' +
      '</manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>',
  );
  zip.file(
    'OEBPS/ch1.xhtml',
    '<html><head><title>t</title></head><body><h1>Chapter One</h1>' +
      '<p>Call me Ishmael.</p><p>Some years ago &mdash; never mind.</p></body></html>',
  );
  zip.file(
    'OEBPS/ch2.xhtml',
    '<html><body><h1>Chapter Two</h1><p>The second part &amp; more.</p></body></html>',
  );
  return zip.generateAsync({ type: 'uint8array' });
}

async function buildGutenbergEpub(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0"><rootfiles>' +
      '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>' +
      '</rootfiles></container>',
  );
  zip.file(
    'OEBPS/content.opf',
    '<?xml version="1.0"?><package version="2.0"><manifest>' +
      '<item id="c1" href="front.xhtml" media-type="application/xhtml+xml"/>' +
      '<item id="c2" href="story.xhtml" media-type="application/xhtml+xml"/>' +
      '<item id="c3" href="licence.xhtml" media-type="application/xhtml+xml"/>' +
      '</manifest><spine>' +
      '<itemref idref="c1"/><itemref idref="c2"/><itemref idref="c3"/>' +
      '</spine></package>',
  );
  zip.file(
    'OEBPS/front.xhtml',
    '<html><body><h1>Header</h1><p>HEADER JUNK</p>' +
      '<p>*** START OF THE PROJECT GUTENBERG EBOOK MOBY DICK ***</p></body></html>',
  );
  zip.file('OEBPS/story.xhtml', '<html><body><h1>Loomings</h1><p>Call me Ishmael.</p></body></html>');
  zip.file(
    'OEBPS/licence.xhtml',
    '<html><body><p>*** END OF THE PROJECT GUTENBERG EBOOK MOBY DICK ***</p>' +
      '<p>LICENCE JUNK</p></body></html>',
  );
  return zip.generateAsync({ type: 'uint8array' });
}

describe('parseEpub', () => {
  it('walks the spine in order and titles chapters from their heading', async () => {
    const result = await parseEpub('b9', await buildEpub());
    expect(result.chapters.map((c) => c.title)).toEqual(['CHAPTER ONE', 'CHAPTER TWO']);
    expect(result.chapters[0].startPage).toBe(0);
    expect(result.chapters[1].startPage).toBe(1);

    const allText = result.pages.map((p) => p.text).join(' ');
    expect(allText).toContain('Call me Ishmael.');
    expect(allText).toContain('second part & more.');
  });

  it('drops the Gutenberg header and licence sections', async () => {
    const result = await parseEpub('b9', await buildGutenbergEpub());
    const allText = result.pages.map((p) => p.text).join(' ');
    expect(allText).toContain('Call me Ishmael.');
    expect(allText).not.toContain('HEADER JUNK');
    expect(allText).not.toContain('LICENCE JUNK');
    expect(allText).not.toContain('PROJECT GUTENBERG');
    expect(result.chapters.map((c) => c.title)).toEqual(['LOOMINGS']);
  });

  it('rejects an archive without a container', async () => {
    const zip = new JSZip();
    zip.file('random.txt', 'nothing');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await expect(parseEpub('b9', bytes)).rejects.toThrow('EPUB_INVALID');
  });

  it('rejects an archive with an empty spine', async () => {
    const zip = new JSZip();
    zip.file(
      'META-INF/container.xml',
      '<container><rootfiles><rootfile full-path="p.opf"/></rootfiles></container>',
    );
    zip.file('p.opf', '<package><manifest/><spine/></package>');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await expect(parseEpub('b9', bytes)).rejects.toThrow('EPUB_INVALID');
  });
});
