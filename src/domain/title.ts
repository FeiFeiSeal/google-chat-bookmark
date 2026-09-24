const MAX_TITLE_GRAPHEMES = 30;

function graphemes(value: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter('zh-Hant', {granularity: 'grapheme'}).segment(value), ({segment}) => segment);
  }
  return Array.from(value);
}

export function truncateGraphemes(value: string, maximum = MAX_TITLE_GRAPHEMES): string {
  return graphemes(value).slice(0, maximum).join('');
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function createDefaultTitle(input: {messageText?: string; date: Date}): string {
  const firstLine = input.messageText?.split(/\r?\n/u).map((line) => line.trim()).find(Boolean);
  return truncateGraphemes(firstLine || `Bookmark · ${localDate(input.date)}`);
}

export function graphemeLength(value: string): number {
  return graphemes(value).length;
}
