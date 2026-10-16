import sanitizeHtml from 'sanitize-html';

// 업무 상세내용 편집기(Quill)가 만드는 서식은 저장 후에도 남아야 한다 — 제목·취소선·인용·코드·목록 종류·표·이미지.
// 붙여 넣은 이미지는 data:image(base64)로 들어온다: 이미지 종류만, 한 장 3MB까지. 스크립트·이벤트 속성은 그대로 제거.
const MAX_DATA_IMAGE_CHARS = 4_000_000; // base64 ≈ 3MB 이미지
const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/;

export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['b', 'i', 'u', 's', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'code', 'span', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      li: ['data-list'],
      pre: ['class', 'data-language'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedClasses: { pre: ['ql-syntax'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => {
      if (frame.tag !== 'img') return false;
      const src = frame.attribs.src ?? '';
      if (!src) return true;
      if (src.startsWith('data:')) return !DATA_IMAGE.test(src) || src.length > MAX_DATA_IMAGE_CHARS;
      return false;
    },
  });
}
