const HEADER_FIELDS = new Set([
  'from',
  'to',
  'cc',
  'bcc',
  'date',
  'subject',
  'sent',
  'received',
  'reply-to',
  'message-id',
  'in-reply-to',
  'references',
  'mime-version',
  'content-type',
  'return-path',
  'delivered-to',
  'dkim-signature',
  'authentication-results',
  'sender',
]);

function isHeaderFieldLine(line: string): boolean {
  const match = line.match(/^([a-z0-9-]+)\s*:/i);
  if (!match) return false;
  const field = match[1].toLowerCase();
  return HEADER_FIELDS.has(field) || field.startsWith('x-');
}

function isForwardMarker(line: string): boolean {
  return (
    /^--+ *forwarded message *--+$/i.test(line) ||
    /^begin +forwarded +message:?$/i.test(line)
  );
}

function isQuoteAttribution(line: string): boolean {
  return /^on\b[\s\S]*\bwrote:$/i.test(line.trim());
}

function isBoilerplateLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /^you received this message because/i.test(t) ||
    /^to unsubscribe/i.test(t) ||
    /^to view this discussion/i.test(t) ||
    /^google groups?:?/i.test(t) ||
    /^visit (this |the )?group at/i.test(t) ||
    /^(thanks|thank you|regards|best regards|warm regards|with regards)[,.\-_]*$/i.test(t) ||
    /^sent from (my )?(iphone|android|windows phone)/i.test(t) ||
    /^-\s*-{2,}$/i.test(t) ||
    /^this (is an|is a|email is|is) (auto|automated|system[- ]generated|auto[- ]generated)/i.test(t) ||
    /^do not reply to this (email|mail|message)/i.test(t) ||
    /^for (any )?(queries|questions|query|assistance)/i.test(t) ||
    /^contact (us|the placement|our)/i.test(t) ||
    /^[a-z .'&-]*placement\s+(?:and\s+training\s+)?cell[,.]?$/i.test(t) ||
    /^pesu? (university|placements app|placements)/i.test(t) ||
    /^deemed to be university/i.test(t) ||
    /^100-?ft ring road/i.test(t)
  );
}

function removeForwardedHeaders(text: string): string {
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length && isHeaderFieldLine(lines[i])) i++;
  const headerBlock = lines.slice(0, i);
  const isRoutingHeader =
    headerBlock.some((l) => /@/.test(l)) ||
    headerBlock.some((l) => /^message[- ]id\s*:/i.test(l) || /^x-[a-z0-9-]+:/i.test(l));
  const body = isRoutingHeader && i > 0 ? lines.slice(i) : lines;
  const out: string[] = [];
  let inForwardBlock = false;

  for (let j = 0; j < body.length; j++) {
    const line = body[j];

    if (inForwardBlock) {
      if (line.trim() === '') {
        inForwardBlock = false;
        continue;
      }
      if (isHeaderFieldLine(line)) continue;
      if (isForwardMarker(line)) {
        inForwardBlock = true;
        continue;
      }
      inForwardBlock = false;
    }

    if (isForwardMarker(line)) {
      inForwardBlock = true;
      continue;
    }

    if (isQuoteAttribution(line)) continue;

    out.push(line);
  }

  return out.join('\n');
}

function removeInlineArtifacts(text: string): string {
  return text
    .replace(/\[image:[^\]]*\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

export function cleanEmailBody(body: string): string {
  if (!body) return '';

  let text = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  text = removeForwardedHeaders(text);
  text = removeInlineArtifacts(text);

  const lines = text.split('\n').map((line) => {
    const trimmedTail = line.replace(/[ \t]+$/g, '');
    if (trimmedTail.trim()) return trimmedTail;
    return '';
  });

  const dropped = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && isBoilerplateLine(lines[i])) dropped.add(i);
  }

  const filtered = lines.filter((_, i) => !dropped.has(i));
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}