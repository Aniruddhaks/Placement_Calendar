import type {
  AdditionalDetails,
  PlacementEventInput,
  ShortlistInput,
  ShortlistStudent,
} from '@/types/events';

export type EmailType = 'EVENT' | 'SHORTLIST' | 'UNKNOWN';

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const GENERIC_COMPANY_WORDS = new Set([
  'dear',
  'students',
  'hello',
  'regarding',
  'subject',
  'notification',
  'advertisement',
  'placement',
  'placements',
  'drive',
  'recruitment',
  'recruit',
  'hiring',
  'opportunity',
  'opportunities',
  'online',
  'technical',
  'shortlisted',
  'shortlist',
  'of',
  'for',
  'the',
  'and',
  'campus',
  'overview',
  'greetings',
  'fwd',
  'fw',
  're',
  'openings',
  'about',
  'event',
  'eligible',
]);

const ROLE_HINTS =
  /intern|developer|engineer|analyst|sde\b|software|product|design|consultant|associate|trainee|full.?stack|front.?end|back.?end|\bdata\b|\bml\b|\bai\b|java|python|cloud|devops|security|manager|specialist|officer|senior|lead|architect|scientist|research|sales|marketing|finance|analytics|support|executive|internship/i;

const EVENT_ONLY_WORDS =
  /(online\s*)?(assessment|test|interview|drive|round|recruitment|hiring|placement|written|aptitude|technical)/i;

function normalizeForKey(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function buildEventDedupKey(event: Pick<
  PlacementEventInput,
  'company_name' | 'role' | 'event_type' | 'event_date' | 'start_time'
>): string {
  const parts = [
    event.company_name,
    event.role,
    event.event_type,
    event.event_date,
    event.start_time || null,
  ]
    .map(normalizeForKey)
    .filter(Boolean);
  return parts.join('|');
}

export function buildShortlistDedupKey(
  shortlist: Pick<ShortlistInput, 'company_name' | 'role' | 'announcement_date'>
): string {
  const parts = [
    shortlist.company_name,
    shortlist.role || null,
    shortlist.announcement_date,
  ]
    .map(normalizeForKey)
    .filter(Boolean);
  return parts.join('|');
}

/**
 * Classifies a PES placement email as a placement event, shortlist, or
 * unrelated/unknown email. Shortlist detection is deliberately conservative:
 * it requires strong announcing signals (subject-level keywords, an explicit
 * shortened/selected-list declaration, or an attached/detailed student roster)
 * so that transient mentions like "the company will share the shortlist later"
 * never turn a normal placement announcement into a shortlist.
 */
export function detectEmailType(subject: string, body: string): EmailType {
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

  if (/(?:shortlist|shortlisted|short listed|selected candidates|selected students|shortlisted (?:candidates|students|for|to))/i.test(lowerSubject)) {
    return 'SHORTLIST';
  }

  const announcesShortlist =
    /\b(?:the\s+)?shortlisted?\s+(?:candidates?|students?)\b/i.test(lowerBody) ||
    /\b(?:following|below|herewith|attached|hereby)\b[^.]{0,80}\b(?:shortlisted?|selected)\b/i.test(lowerBody) ||
    /\b(?:shortlisted?|selected)\b[^.]{0,80}\b(?:list of|students are|students have been|candidates are|candidates have been)\b/i.test(lowerBody) ||
    /\b\d{1,4}\s+(?:students|candidates)\s+(?:have\s+been\s+)?shortlisted\b/i.test(lowerBody) ||
    /\bshortlisted\s+(?:in|under|for)\s+/i.test(lowerBody);

  const isFutureOnlyMention =
    /\b(?:company|team|will|would|shall|be|to|may|might)\b(?:[^.\n]{0,60})\b(?:share|release|announce|post|intimate|inform|notify|send|update|communicate)\b/i.test(
      lowerBody
    ) &&
    /\bshortlist|\bshortlisted/i.test(lowerBody) &&
    !announcesShortlist;

  if (announcesShortlist && !isFutureOnlyMention) {
    return 'SHORTLIST';
  }

  const eventKeywords = [
    'online assessment',
    'online test',
    'technical interview',
    'assessment',
    'interview',
    'test',
    'drive',
    'placement',
    'recruitment',
    'hiring',
    'written test',
    'aptitude',
  ];

  for (const keyword of eventKeywords) {
    if (lowerSubject.includes(keyword) || lowerBody.includes(keyword)) {
      return 'EVENT';
    }
  }

  return 'UNKNOWN';
}

// ────────────────────────────────────────────────────────────────────────────
// Date / time helpers
// ────────────────────────────────────────────────────────────────────────────

interface DateCandidate {
  value: string; // YYYY-MM-DD
  index: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function findDateCandidates(text: string): DateCandidate[] {
  const candidates: DateCandidate[] = [];
  const patterns: { rx: RegExp; parse: (m: RegExpMatchArray) => string | null }[] =
    [
      {
        // 29/09/2026 | 29-09-2026 | 29.09.2026 (DD/MM/YYYY)
        rx: /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g,
        parse: (m) => {
          const d = Number(m[1]);
          const mo = Number(m[2]);
          let y = Number(m[3]);
          if (y < 100) y += y < 70 ? 2000 : 1900;
          if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
          return `${y}-${pad2(mo)}-${pad2(d)}`;
        },
      },
      {
        // 2026-09-29 | 2026/09/29
        rx: /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g,
        parse: (m) => {
          const y = Number(m[1]);
          const mo = Number(m[2]);
          const d = Number(m[3]);
          if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
          return `${y}-${pad2(mo)}-${pad2(d)}`;
        },
      },
      {
        // 29 Sep 2026 | 29th September, 2026
        rx: /\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)[a-z]*\s*,?\s*(\d{2,4})\b/gi,
        parse: (m) => {
          const d = Number(m[1]);
          const mo = MONTHS[(m[2] as string).toLowerCase().slice(0, 3)];
          let y = Number(m[3]);
          if (y < 100) y += y < 70 ? 2000 : 1900;
          if (!mo || d < 1 || d > 31) return null;
          return `${y}-${pad2(mo)}-${pad2(d)}`;
        },
      },
      {
        // Sep 29, 2026 | September 29th 2026
        rx: /\b([a-z]+)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{2,4})\b/gi,
        parse: (m) => {
          const mo = MONTHS[(m[1] as string).toLowerCase().slice(0, 3)];
          const d = Number(m[2]);
          let y = Number(m[3]);
          if (y < 100) y += y < 70 ? 2000 : 1900;
          if (!mo || d < 1 || d > 31) return null;
          return `${y}-${pad2(mo)}-${pad2(d)}`;
        },
      },
    ];

  for (const { rx, parse } of patterns) {
    rx.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rx.exec(text)) !== null) {
      const value = parse(match);
      if (value && !isEmailHeaderField(text, match.index)) {
        candidates.push({ value, index: match.index });
      }
      if (match.index === rx.lastIndex) rx.lastIndex += 1;
    }
  }

  candidates.sort((a, b) => a.index - b.index);
  return candidates;
}

const EVENT_DATE_CONTEXT =
  /\b(date|day|held|conducted|scheduled|scheduled on|round|drive|test|interview|assessment|starting|starts|begins|program|event)\b/i;

const EMAIL_HEADER_FIELD =
  /^(?:from|to|cc|bcc|date|subject|sent|received|reply-to|message-id|in-reply-to|references|mime-version|content-type|sender|return-path|delivered-to|dkim-signature|authentication-results)\s*:\s*/i;

function isEmailHeaderField(text: string, start: number): boolean {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const prefix = text.slice(lineStart, start);
  if (!EMAIL_HEADER_FIELD.test(prefix)) return false;

  // Only treat the match as an email metadata header when it sits inside a
  // header block — i.e. a neighboring line is also a known header field.
  // Structured placement templates legitimately start values with "Date:",
  // "Subject:", etc., so a lone label must still be parsed as content.
  const blockStart = text.lastIndexOf('\n\n', start - 1);
  const blockStartOffset = blockStart === -1 ? 0 : blockStart + 2;
  const before = text.slice(blockStartOffset, start).split('\n');
  before.pop();
  for (let i = 0; i < before.length; i++) {
    if (before[i].trim() && EMAIL_HEADER_FIELD.test(before[i])) return true;
  }
  return false;
}

const DEADLINE_CONTEXT =
  /\b(deadline|last\s*date|last\s*day|apply|register|registration|submit|submission|before|closes|closure|by\s)\b/i;

function contextAround(text: string, index: number, window = 60): string {
  const start = Math.max(0, index - window);
  return text.slice(start, index);
}

function pickEventDate(
  text: string,
  candidates: DateCandidate[]
): string | null {
  const eventContext = candidates.filter(
    (c) =>
      EVENT_DATE_CONTEXT.test(contextAround(text, c.index)) &&
      !DEADLINE_CONTEXT.test(contextAround(text, c.index))
  );
  if (eventContext.length > 0) return eventContext[0].value;

  const nonDeadline = candidates.filter(
    (c) => !DEADLINE_CONTEXT.test(contextAround(text, c.index))
  );
  if (nonDeadline.length > 0) return nonDeadline[0].value;

  return candidates[0]?.value ?? null;
}

function pickDeadline(
  text: string,
  candidates: DateCandidate[]
): { date: string; index: number } | null {
  const labeled = candidates.find((c) =>
    DEADLINE_CONTEXT.test(contextAround(text, c.index))
  );
  if (labeled) return { date: labeled.value, index: labeled.index };
  return null;
}

function extractEventDate(subject: string, body: string): string | null {
  const text = `${subject}\n${body}`;
  const candidates = findDateCandidates(text);
  if (candidates.length === 0) return null;
  return pickEventDate(text, candidates);
}

function extractDeadlineDate(subject: string, body: string): string | null {
  const text = `${subject}\n${body}`;
  const candidates = findDateCandidates(text);
  if (candidates.length === 0) return null;
  const result = pickDeadline(text, candidates);
  if (!result) return null;
  // If a time followed the deadline date (e.g. "by 25 Sep 6 PM"), try to keep it.
  const after = text.slice(result.index, result.index + 40);
  const time = matchTime(after);
  return time
    ? deadlineWithTime(result.date, time)
    : `${result.date}T23:59:59.000+05:30`;
}

interface ParsedTime {
  startTime: string | null;
  endTime: string | null;
}

function to24h(h: number, m: number | null, meridiem: string | null): string {
  const minute = m ?? 0;
  let hour = h;
  const am = meridiem?.toLowerCase();
  if (am) {
    if (am.startsWith('a') && hour === 12) hour = 0;
    if (am.startsWith('p') && hour !== 12) hour += 12;
  } else if (hour > 23) {
    hour = 0;
  }
  return `${pad2(hour)}:${pad2(minute)}`;
}

function matchTime(text: string): ParsedTime | null {
  const range = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—to]|[\-–—])\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
  );
  if (range) {
    const start = to24h(
      Number(range[1]),
      range[2] ? Number(range[2]) : 0,
      range[3] ?? null
    );
    const end = range[4] ? to24h(Number(range[4]), range[5] ? Number(range[5]) : 0, range[6] ?? null) : null;
    return { startTime: start, endTime: end };
  }

  const single = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (single) {
    return {
      startTime: to24h(Number(single[1]), single[2] ? Number(single[2]) : 0, single[3]),
      endTime: null,
    };
  }

  return null;
}

function extractTime(body: string): ParsedTime {
  const text = body.replace(/\r/g, '');
  const labeled = text.match(/\b(?:time|timings?|duration)\s*[:：]\s*([^\n]{0,80})/i);
  if (labeled) {
    const parsed = matchTime(labeled[1]);
    if (parsed) return parsed;
  }
  const parsed = matchTime(text);
  return parsed ?? { startTime: null, endTime: null };
}

function deadlineWithTime(date: string, time: ParsedTime): string {
  const d = time.startTime || '23:59';
  return `${date}T${d}:00.000+05:30`;
}

// ────────────────────────────────────────────────────────────────────────────
// Placement event parsing
// ────────────────────────────────────────────────────────────────────────────

function cleanLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isCompanyCandidate(value: string | undefined): boolean {
  if (!value) return false;
  const candidate = value
    .replace(/^\s*(?:fwd|fw|re)\s*[:|\-–—]?\s*/i, '')
    .trim();
  if (candidate.length < 2 || candidate.length > 60) return false;
  if (GENERIC_COMPANY_WORDS.has(candidate.toLowerCase())) return false;

  const words = candidate.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length > 0 && words.every((w) => GENERIC_COMPANY_WORDS.has(w))) {
    return false;
  }
  return true;
}

const ROLE_SEGMENT_RX =
  /^(?:sde|sde intern|software(?: engineer)?(?: intern)?|frontend|backend|full[- ]?stack(?: developer)?|developer(?: intern)?|engineer(?: intern)?|intern|internship|data(?: scientist| analyst| engineer)?|\bml\b|ai|ml engineer|ai engineer|devops|qa|tester|analyst|product(?: manager)?|designer|ux|consultant|associate|trainee|java(?: developer)?|python(?: developer)?|cloud(?: engineer)?|security(?: engineer)?|mobile(?: developer)?|react|node|dev)(?: intern)?$/i;

function isRoleLikeSegment(segment: string): boolean {
  return ROLE_SEGMENT_RX.test(segment.trim());
}

function extractCompany(subject: string, body: string): string | null {
  const bodyLines = body.split('\n').map((l) => l.trim()).filter(Boolean);

  // Structured template fields: "Event:", "Company:", "Company Name:", "Organization:"
  const labeled =
    body.match(/\bcompany\s*(?:name)?\s*[:：]\s*([^\n]{2,80})/i) ||
    body.match(/\bevent\s*[:：]\s*([^\n]{2,80})/i) ||
    subject.match(/\bcompany\s*(?:name)?\s*[:：]\s*([^\n]{2,80})/i);
  if (labeled && isCompanyCandidate(labeled[1].split(/\s*[-–—|]\s*/)[0])) {
    return cleanLabel(labeled[1].split(/\s*[-–—|]\s*/)[0]);
  }

  // "Acme Corp - SDE Intern - Online Assessment" → "Acme Corp"
  // Iterate all subject segments so generic/role/stage prefixes ("Fwd:",
  // "Placement", "SDE Intern") are skipped in favor of the actual company.
  const subjectSegments = subject
    .replace(/^\s*(?:fwd|fw|fwd:|fw:|re|re:|\[fwd\]|\[re\])\s*[:|\-–—]?\s*/i, '')
    .split(/\s*[-–—|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const segment of subjectSegments) {
    if (isCompanyCandidate(segment) && !isRoleLikeSegment(segment)) return segment;
  }
  for (const segment of subjectSegments) {
    if (isCompanyCandidate(segment)) return segment;
  }

  // "hiring / drive / recruitment for Acme Corp"
  const intro = body.match(
    /\b(?:drive|hiring|recruitment|opportunity|openings?|vacancies?)\s+(?:for|by|at|from)\s+([A-Za-z0-9 .&'-]+)/i
  );
  if (intro) {
    const company = cleanLabel(intro[1]);
    if (isCompanyCandidate(company)) return company;
  }

  // First substantive body line, taking the first segment before a separator.
  for (const line of bodyLines) {
    const candidate = line.split(/\s*[-–—|]\s*/)[0]?.trim();
    if (!candidate) continue;
    if (/^[a-z]{2,30}[:：]/i.test(candidate)) continue;
    if (/^\d{1,4}(?:st|nd|rd|th)?\s+[a-z]+\s*,?\s*\d{2,4}/i.test(candidate)) continue;
    if (isCompanyCandidate(candidate)) return candidate;
  }

  return null;
}

function cleanRole(value: string): string {
  return cleanLabel(value)
    .replace(EVENT_ONLY_WORDS, ' ')
    .replace(/^(?:for|of|role|position)\s*[-: ]+/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[|,;]+$/, '')
    .trim();
}

function extractRole(subject: string, body: string): string | null {
  const text = `${subject}\n${body}`;

  const labeled = text.match(
    /\b(?:role|position|designation|profile|opening|internship|job\s+title|post)\s*[:：]\s*([^\n]{2,80})/i
  );
  if (labeled) {
    const role = cleanRole(labeled[1]);
    if (role) return role;
  }

  const segments = [
    ...subject.split(/\s*[-–—|]\s*/),
    ...body.split(/\s*[-–—|•·*]\s*/),
  ].filter(Boolean);

  for (const segment of segments) {
    if (ROLE_HINTS.test(segment) && !EVENT_ONLY_WORDS.test(segment)) {
      const role = cleanRole(segment);
      if (role && role.length <= 60) return role;
    }
  }

  // "registered for SDE Intern role at Acme"
  const inline = text.match(
    /\b(?:for|role of|as an?)\s+([A-Za-z0-9 .&/'+.-]+?)\s+(?:role|position|intern|internship|developer|engineer|analyst|profile)/i
  );
  if (inline) {
    return cleanRole(inline[1]);
  }

  return null;
}

const EARLIEST_STAGE_PATTERNS: { type: 'OA' | 'TECHNICAL_INTERVIEW'; rx: RegExp }[] = [
  {
    type: 'OA',
    rx: /online\s*(assessment|test)|assessment|online test|aptitude|written test|oa\b|hackerrank|hackerearth|coding\s*(test|assessment)|technical\s*(test|assessment)/i,
  },
  {
    type: 'TECHNICAL_INTERVIEW',
    rx: /technical\s*interview|\binterviews?\b|hiring\s*manager\s*interview|mr?\s*round|\bpi\b|personality\s*interview/i,
  },
];

function extractEventType(subject: string, body: string): 'OA' | 'TECHNICAL_INTERVIEW' {
  const text = `${subject}\n${body}`;

  let earliest: { type: 'OA' | 'TECHNICAL_INTERVIEW'; index: number } | null = null;
  for (const { type, rx } of EARLIEST_STAGE_PATTERNS) {
    const match = rx.exec(text);
    if (match && (!earliest || match.index < earliest.index)) {
      earliest = { type, index: match.index };
    }
  }

  if (!earliest) return 'OA';
  return earliest.type;
}

function extractMode(body: string): string | null {
  const labeled = body.match(/\b(?:mode|manner)\s*[:：]\s*([^\n]{2,40})/i);
  if (labeled) return cleanLabel(labeled[1]);

  const lower = body.toLowerCase();
  if (lower.includes('online') || lower.includes('virtual') || lower.includes('remote'))
    return 'Online';
  if (lower.includes('offline') || lower.includes('in-person') || lower.includes('on campus'))
    return 'Offline';
  return null;
}

function extractVenue(body: string): string | null {
  const labeled = body.match(/\b(?:venue|platform|link|meeting)\s*[:：]\s*([^\n]{2,120})/i);
  if (labeled) return cleanLabel(labeled[1]);
  return null;
}

function extractLocation(body: string): string | null {
  const labeled = body.match(
    /\b(?:location|city|job\s*location|work\s*location)\s*[:：]\s*([^\n]{2,80})/i
  );
  if (labeled) return cleanLabel(labeled[1]);

  const basedIn = body.match(
    /\b(?:based\s*in|located\s*in)\s+([A-Za-z][A-Za-z .'-]+?)(?:,\s*India)?\b/i
  );
  if (basedIn) return cleanLabel(basedIn[1]);
  return null;
}

function extractStipend(body: string): string | null {
  const labeled = body.match(
    /\b(?:stipend|salary|compensation|package|ctc)\s*[:：]\s*([^\n]{2,60})/i
  );
  if (labeled) return cleanLabel(labeled[1]);

  const lpa = body.match(
    /₹?\s*(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*(?:lakh|\blpa\b)/i
  );
  if (lpa) return `${lpa[1]} LPA`;

  const perMonth = body.match(
    /₹?\s*(\d+[,\d]*)\s*\/(?:month|per\s*month|monthly)/i
  );
  if (perMonth) return `₹${perMonth[1]}/month`;

  return null;
}

function extractEligibility(body: string): string | null {
  const labeled = body.match(
    /\b(?:eligibility|criteria|qualification|eligible|who can apply)\s*[:：]\s*([^\n]{2,150})/i
  );
  if (labeled) return cleanLabel(labeled[1]);

  const cgpa = body.match(/\bcgpa\s*(?:>=|>|\s*(?:of|cutoff)\s*)?\s*(\d+(?:\.\d+)?)/i);
  const batch = body.match(/\b(?:batch|year of)\s*(?:of\s*)?(?:\d{4})\b/i);
  if (cgpa || batch) {
    const parts: string[] = [];
    if (cgpa) parts.push(`CGPA ${cgpa[1]}`);
    if (batch) parts.push(cleanLabel(batch[0]));
    return parts.join(', ');
  }
  return null;
}

function extractDescription(body: string): string | null {
  const paragraphs = body
    .split(/^\s*$/m)
    .map((p) => p.replace(/\r/g, '').trim())
    .filter((p) => p.length > 10);

  for (const paragraph of paragraphs) {
    if (/^dear|^hi |^hello|^greetings|^respect|^subject|^event\s*details\b/i.test(paragraph)) continue;
    if (/^(regards|thanks|thank you|warm|best|sent from|this is an? (auto|system))/i.test(paragraph)) break;
    if (/^(you received|to unsubscribe|to view this discussion|google group)/i.test(paragraph)) continue;
    if (/^https?:\/\//i.test(paragraph)) continue;
    if (/(?:company|role|position|eligibility|location|stipend|ctc|rounds?|date|time|departments?|platform|mode|application deadline|venue)\s*[:：]\s*[^\n]{1,80}/i.test(paragraph) && !/\n/.test(paragraph)) {
      continue;
    }
    const cleaned = paragraph.replace(/\n{2,}/g, '\n').trim();
    if (cleaned.length > 0) {
      return cleaned.slice(0, 800);
    }
  }
  return null;
}

const EXTRA_LABELS: { key: string; rx: RegExp; list?: boolean }[] = [
  { key: 'departments', rx: /\b(?:department|departments|depts|branches?|streams?)\s*[:：]\s*([^\n]{2,120})/i, list: true },
  { key: 'rounds', rx: /\brounds?\s*[:：]\s*([^\n]{2,120})/i },
  { key: 'ctc', rx: /\bctc\s*[:：]\s*([^\n]{2,60})/i },
  { key: 'platform', rx: /\bplatform\s*[:：]\s*([^\n]{2,80})/i },
  { key: 'backlogs', rx: /\bbacklogs?\s*[:：]\s*([^\n]{2,60})/i },
  { key: 'attempts', rx: /\b(?:max\s*attempts?|attempts?)\s*[:：]\s*([^\n]{2,40})/i },
  { key: 'difficulty', rx: /\bdifficulty\s*[:：]\s*([^\n]{2,60})/i },
  { key: 'graduation_year', rx: /\b(?:batch|graduation\s*year|passing\s*out|class\s*of)\s*[:：]?\s*(\d{4})(?:\s*-\s*\d{2,4})?/i },
  { key: 'internship_duration', rx: /\b(?:internship\s*(?:duration|timeline|period|tenure)|duration)\s*[:：]\s*([^\n]{2,60})/i },
  { key: 'housing_stipend', rx: /\bhousing\s*(?:and|&)?\s*stipend\s*[:：]\s*([^\n]{2,60})/i },
  { key: 'tentative_next_steps', rx: /\btentative\s+next\s+steps?\s*[:：]\s*([^\n]{2,200})/i },
];

const SECTION_LABELS: { key: string; rx: RegExp }[] = [
  { key: 'tentative_next_steps', rx: /\btentative\s+next\s+steps?\s*[:：]/i },
  { key: 'important_notes', rx: /\bimportant\s+(?:note|notes|points|information)\s*[:：]/i },
];

function splitList(value: string): string[] {
  return value
    .split(/[,;•·*•\-–—]|\b(?:and|&)\b|\n/i)
    .map((item) => cleanLabel(item).replace(/^\d+[.)]\s*/, ''))
    .filter((item) => item.length > 1 || /^[A-Za-z]$/.test(item));
}

function extractSectionItems(body: string, rx: RegExp): string[] | undefined {
  const match = body.match(rx);
  if (!match) return undefined;

  const start = match.index !== undefined ? match.index + match[0].length : 0;
  const rest = body.slice(start);
  const lines = rest.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!items.length && !trimmed) continue;
    if (!trimmed) break;
    if (/^[A-Za-z][A-Za-z\s]{0,30}[:：]\s/.test(trimmed)) break;
    const item = cleanLabel(trimmed).replace(/^[-•·*\d]+[.)\s]*/, '');
    if (item && item.length > 1 && !/^(?:and|or)\b/i.test(item)) {
      items.push(item);
    }
  }

  return items.length > 0 ? items : undefined;
}

function extractRegistrationUrl(body: string): string | undefined {
  const labeled = body.match(
    /\b(?:registration\s*link|register\s*here|apply\s*(?:here|now)|application\s*link|sign\s*up)\s*[:：]?\s*((?:https?:\/\/)?(?:[^\s\n]{5,160}))/i
  );
  if (labeled) {
    const url = labeled[1].trim();
    if (/https?:\/\//i.test(url)) return url;
    return `https://${url.replace(/^https?:\/\//i, '')}`;
  }

  const candidates = body.match(/https?:\/\/[^\s\n)<>"']+/gi);
  if (!candidates) return undefined;

  const valid = candidates.filter(
    (url) =>
      !/gmail\.com|facebook|twitter|instagram|linkedin\.com|unsubscribe|tracking|gravatar|\/tr\?|mailto:/i.test(url)
  );
  return valid[0];
}

function extractAdditionalDetails(
  body: string
): AdditionalDetails | undefined {
  const details: Record<string, string | string[]> = {};

  for (const { key, rx, list } of EXTRA_LABELS) {
    const match = body.match(rx);
    if (!match || !match[1]?.trim()) continue;

    if (key === 'tentative_next_steps') {
      const items = extractSectionItems(body, rx);
      if (items) details[key] = items;
      continue;
    }

    if (key === 'graduation_year') {
      const year = match[1];
      if (/^\d{4}$/.test(year)) details[key] = year;
      continue;
    }

    const value = cleanLabel(match[1]).slice(0, 200);
    if (!value) continue;

    if (list && /[|,;•·]|\b(?:and|&)\b|\s{2,}/.test(value)) {
      details[key] = splitList(value).slice(0, 20);
    } else {
      details[key] = value;
    }
  }

  for (const { key, rx } of SECTION_LABELS) {
    const items = extractSectionItems(body, rx);
    if (items) details[key] = items;
  }

  const registrationUrl = extractRegistrationUrl(body);
  if (registrationUrl) details.registration_url = registrationUrl;

  return Object.keys(details).length > 0 ? details : undefined;
}

/**
 * Parses a PES placement event email into a draft event input.
 * Returns null when the email cannot be confidently parsed into an event
 * (no company or no event date). Missing/optional values are left null.
 */
export function parsePlacementEvent(
  subject: string,
  body: string,
  sourceEmailId: string
): PlacementEventInput | null {
  const companyName = extractCompany(subject, body);
  const eventDate = extractEventDate(subject, body);

  if (!companyName || !eventDate) {
    return null;
  }

  const eventType = extractEventType(subject, body);
  const role = extractRole(subject, body);
  const { startTime, endTime } = extractTime(body);
  const mode = extractMode(body);
  const venue = extractVenue(body);
  const location = extractLocation(body);
  const applicationDeadline = extractDeadlineDate(subject, body);
  const stipend = extractStipend(body);
  const eligibility = extractEligibility(body);
  const description = extractDescription(body);
  const additionalDetails = extractAdditionalDetails(body);

  return {
    company_name: companyName,
    role: role || 'Not specified',
    event_type: eventType,
    event_date: eventDate,
    start_time: startTime,
    end_time: endTime,
    mode,
    venue,
    location,
    application_deadline: applicationDeadline,
    stipend,
    eligibility,
    description,
    additional_details: additionalDetails,
    status: 'draft',
    source_email_id: sourceEmailId,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Shortlist parsing
// ────────────────────────────────────────────────────────────────────────────

const USN_RX =
  /\b(?:PES\d{9,13}|[0-9]{1}PE\d{2}[A-Z]{2}\d{2,4}|[A-Z]{2,4}\d{5,9})\b/i;

/**
 * Extracts a list of student name/USN pairs from a shortlist email body.
 * Only information actually present in the email is preserved — a student
 * whose name is missing will be stored with only a USN and vice versa.
 */
export function extractStudents(body: string): ShortlistStudent[] {
  const students: ShortlistStudent[] = [];
  const seen = new Set<string>();
  const lines = body
    .replace(/[ \t]+/g, ' ')
    .split(/[\n;•·*]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const add = (student: ShortlistStudent) => {
    const key = `${student.name || ''}|${student.usn || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    students.push(student);
  };

  const fallbackText = body.replace(/[ \t]+/g, ' ');

  for (const line of lines) {
    const cleaned = line.replace(/^\d+(?:[.)]\s*|\s*[-–—]\s*)/, '');
    // "1. Name - USN" | "Name | USN" | "Name: USN" | "Name (USN)"
    const named = cleaned.match(
      /^([A-Za-z][A-Za-z.\s'-]{1,60}?)\s*(?:[-–—:,(|]\s*|\s[-–—|]\s*|\s[(|]\s*)?\b(PES\d{9,13}|[0-9]{1}PE\d{2}[A-Z]{2}\d{2,4}|[A-Z]{2,4}\d{5,9})\b/i
    );
    if (named) {
      const name = cleanLabel(named[1]).replace(/^[0-9.\s]+/, '');
      const usn = named[2].toUpperCase();
      const cleanedName =
        name.length >= 2 && /[a-z]/i.test(name) ? name : undefined;
      add(cleanedName ? { name: cleanedName, usn } : { usn });
      continue;
    }

    const usnOnly = cleaned.match(
      /\b(PES\d{9,13}|[0-9]{1}PE\d{2}[A-Z]{2}\d{2,4}|[A-Z]{2,4}\d{5,9})\b/i
    );
    if (usnOnly) {
      add({ usn: usnOnly[1].toUpperCase() });
      continue;
    }
  }

  // Lines of consecutive name(s) followed by a line of USNs:
  // "Aarav Sharma, Meera Nair" / "PES1202200001, PES1202200002"
  if (students.length === 0) {
    const nameLine = fallbackText.match(
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s*[,&]\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)+/
    );
    const usnLine = fallbackText.match(
      /(?:PES\d{9,13}|[0-9]{1}PE\d{2}[A-Z]{2}\d{2,4})(?:\s*[, ]+\s*(?:PES\d{9,13}|[0-9]{1}PE\d{2}[A-Z]{2}\d{2,4}))+/
    );
    if (nameLine && usnLine) {
      const names = nameLine[0].split(/\s*[,&]\s*/).map((n) => n.trim());
      const usns = usnLine[0].split(/\s*[, ]+\s*/);
      const count = Math.min(
        names.length,
        usns.filter((u) => USN_RX.test(u)).length
      );
      for (let i = 0; i < count; i++) {
        add({ name: names[i], usn: usns[i].toUpperCase() });
      }
    }
  }

  return students;
}

function extractCount(body: string): number | null {
  const match = body.match(
    /\b(\d{1,4})\s+(?:candidates|students)\s+(?:are\s+)?shortlisted/i
  );
  if (match) return Number(match[1]);
  const match2 = body.match(
    /\bshortlisted\s+(?:for\s+(?:the\s+)?)?(\d{1,4})\s+(?:candidates|students|people)\b/i
  );
  return match2 ? Number(match2[1]) : null;
}

/**
 * Parses a shortlist email into a draft shortlist input.
 * An announcement_date is required so retries keep the same dedup identity.
 */
export function parseShortlist(
  subject: string,
  body: string,
  sourceEmailId: string,
  announcementDate: string
): ShortlistInput | null {
  const companyName = extractCompany(subject, body);
  if (!companyName) {
    return null;
  }

  const role = extractRole(subject, body);
  const students = extractStudents(body);
  const mentionedCount = extractCount(body);
  const studentCount =
    students.length > 0 ? students.length : mentionedCount;

  return {
    company_name: companyName,
    role: role || null,
    announcement_date: announcementDate,
    student_count: studentCount,
    students: students.length > 0 ? students : undefined,
    source_email_id: sourceEmailId,
    status: 'draft',
  };
}