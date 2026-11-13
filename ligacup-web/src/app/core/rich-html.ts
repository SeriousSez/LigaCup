import createDOMPurify from 'dompurify';

const imageClasses = new Set(['rte-image-small', 'rte-image-medium', 'rte-image-large', 'rte-image-full']);
const length = /^(?:auto|\d+(?:\.\d+)?(?:px|pt|em|rem|%)?|small|medium|large|x-small|x-large|xx-small|xx-large)$/i;
const color = /^(?:#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s,.%]+\)|hsla?\([\d\s,.%]+\))$/i;
const styles: Record<string, RegExp> = {
  color, 'background-color': color,
  width: length, 'max-width': length, height: length, 'font-size': length,
  'font-family': /^[a-z\d\s,'"_-]+$/i,
  'font-weight': /^(?:normal|bold|bolder|lighter|[1-9]00)$/i,
  'font-style': /^(?:normal|italic|oblique)$/i,
  'text-align': /^(?:left|right|center|justify|start|end)$/i,
  'text-decoration': /^(?:none|underline|line-through|overline)(?:\s+(?:underline|line-through|overline))*$/i,
  'vertical-align': /^(?:baseline|sub|super|top|middle|bottom|text-top|text-bottom)$/i,
};

/** Sanitize before every HTML insertion, including legacy content and clipboard/drop HTML. */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  const purifier = createDOMPurify(window);
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof window.HTMLElement)) return;
    for (const attribute of ['src', 'href']) {
      const value = node.getAttribute(attribute);
      if (value === null) continue;
      try {
        const protocol = new URL(value, 'https://relative.invalid/').protocol;
        if (!(attribute === 'src' ? ['https:', 'http:'] : ['https:', 'http:', 'mailto:', 'tel:']).includes(protocol))
          node.removeAttribute(attribute);
      } catch { node.removeAttribute(attribute); }
    }
    const classes = [...node.classList].filter((name) => imageClasses.has(name));
    if (classes.length) node.setAttribute('class', classes.join(' '));
    else node.removeAttribute('class');
    const safeStyles: [string, string][] = [];
    for (const property of Object.keys(styles)) {
      const value = node.style.getPropertyValue(property).trim();
      if (styles[property]?.test(value)) safeStyles.push([property, value]);
    }
    node.removeAttribute('style');
    for (const [property, value] of safeStyles) node.style.setProperty(property, value);
  });
  return purifier.sanitize(html, {
    ALLOWED_TAGS: ['p', 'div', 'br', 'hr', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
      'sub', 'sup', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre',
      'code', 'a', 'img', 'font', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'width', 'height', 'loading',
      'color', 'size', 'face', 'align', 'colspan', 'rowspan', 'start', 'type'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    // DOMPurify otherwise permits data: images. Permit only these explicit schemes or relative URLs.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    ADD_DATA_URI_TAGS: [],
    FORBID_TAGS: ['svg', 'math'],
  });
}
