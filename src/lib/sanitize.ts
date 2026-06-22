import sanitizeHtml from 'sanitize-html';

export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['b', 'i', 'u', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br'],
    allowedAttributes: { a: ['href', 'target'] },
  });
}
