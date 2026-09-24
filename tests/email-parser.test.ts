import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectEmailType,
  extractStudents,
  parsePlacementEvent,
  parseShortlist,
  buildEventDedupKey,
} from '../lib/email-parser.ts';
import { cleanEmailBody } from '../lib/email-cleaner.ts';

test('throws: cleanEmailBody strips forwarding headers and boilerplate', () => {
  const raw = [
    '---------- Forwarded message ---------',
    'From: John Doe <john@example.com>',
    'Date: Mon, 5 Oct 2026 09:00:00 +0530',
    'Subject: Fwd: Placement Drive | Acme Corp | SDE Intern',
    'To: placement@pes.edu',
    '',
    'Dear Students,',
    '',
    'We are conducting a placement drive for Acme Corp.',
    '',
    'Regards,',
    'Placement Cell',
    '',
    'You received this message because you are subscribed to the Google',
    'Groups "PES Placements" group.',
  ].join('\n');

  const cleaned = cleanEmailBody(raw);
  assert.ok(!cleaned.includes('Forwarded message'));
  assert.ok(!cleaned.includes('john@example.com'));
  assert.ok(!cleaned.includes('You received this message'));
  assert.ok(!cleaned.includes('Placement Cell'));
  assert.ok(cleaned.includes('Dear Students'));
  assert.ok(cleaned.includes('Acme Corp'));
});

test('structured PES template parses into a full draft event', () => {
  const subject = 'Fwd: Placement Drive | Acme Corp | SDE Intern | Online Assessment';
  const body = [
    'Dear Students,',
    '',
    'We are pleased to announce a placement drive for Acme Corp.',
    '',
    'Event: Acme Corp',
    'Role: SDE Intern',
    'Event Type: Online Assessment',
    'Date: 29th September 2026',
    'Time: 09:00 AM - 11:00 AM',
    'Application Deadline: 25th September 2026',
    'Location: Bengaluru',
    'Stipend: ₹12 LPA',
    'Eligibility: BE 2027 batch, CGPA 6.5 and above',
    'Departments: CSE, ISE, ECE',
    'Platform: HackerRank',
    'CTC: 12 LPA',
    '',
    'Regards,',
    'Placement Cell',
  ].join('\n');

  const parsed = parsePlacementEvent(subject, body, 'email-123');
  assert.ok(parsed, 'event should parse');
  assert.equal(parsed.company_name, 'Acme Corp');
  assert.equal(parsed.role, 'SDE Intern');
  assert.equal(parsed.event_type, 'OA');
  assert.equal(parsed.event_date, '2026-09-29');
  assert.equal(parsed.start_time, '09:00');
  assert.equal(parsed.end_time, '11:00');
  assert.equal(parsed.application_deadline, '2026-09-25T23:59:59.000+05:30');
  assert.equal(parsed.mode, 'Online');
  assert.equal(parsed.location, 'Bengaluru');
  assert.ok(parsed.stipend?.includes('12 LPA'));
  assert.ok(parsed.eligibility?.includes('6.5'));

  const details = parsed.additional_details ?? {};
  assert.deepEqual(details.departments, ['CSE', 'ISE', 'ECE']);
  assert.equal(details.platform, 'HackerRank');
  assert.equal(parsed.status, 'draft');
  assert.equal(parsed.source_email_id, 'email-123');
});

test('free-form Apple-style email: company from subject, next steps, shortlist mention is not a shortlist', () => {
  const subject = 'Internship | Apple';
  const body = [
    'Dear Students,',
    '',
    'Apple is hiring for the role of Software Engineer Intern at Bengaluru.',
    '',
    'Role: Software Engineer Intern',
    'Location: Bengaluru',
    'Monthly Stipend: ₹60,000/month',
    'Housing Stipend: ₹12,000',
    'Eligibility: 2026 batch, no active backlogs',
    'Date: 15th October 2026',
    'Registration Link: https://forms.gle/AbCdEf123',
    '',
    'Tentative Next Steps:',
    '1. Online Assessment (Aptitude + Technical)',
    '2. Technical Interview',
    '3. HR Round',
    '',
    'Note: The company will share the shortlist after the assessment.',
    '',
    'Regards,',
    'Placement Cell',
  ].join('\n');

  assert.equal(detectEmailType(subject, body), 'EVENT');

  const parsed = parsePlacementEvent(subject, body, 'email-456');
  assert.ok(parsed, 'event should parse');
  assert.equal(parsed.company_name, 'Apple');
  assert.equal(parsed.role, 'Software Engineer Intern');
  assert.equal(parsed.event_type, 'OA');
  assert.equal(parsed.event_date, '2026-10-15');

  const details = parsed.additional_details ?? {};
  assert.deepEqual(details.tentative_next_steps, [
    'Online Assessment (Aptitude + Technical)',
    'Technical Interview',
    'HR Round',
  ]);
  assert.equal(details.housing_stipend, '₹12,000');
  assert.equal(details.registration_url, 'https://forms.gle/AbCdEf123');
  assert.ok(parsed.description?.includes('Apple is hiring'));
  assert.ok(!parsed.description?.includes('Placement Cell'));
});

test('conservative shortlist: transient "will share the shortlist" must not classify as shortlist', () => {
  const subject = 'Acme Corp | Technical Interview Update';
  const body = [
    'Dear Students,',
    '',
    'We conducted the online assessment for Acme Corp last week.',
    'The company will share the shortlist with us shortly.',
    '',
    'Regards,',
    'Placement Cell',
  ].join('\n');

  assert.equal(detectEmailType(subject, body), 'EVENT');
});

test('real shortlist announcing selected students is classified as SHORTLIST', () => {
  const subject = 'Shortlist - Acme Corp | Technical Interview';
  const body = [
    'Dear Students,',
    '',
    'The following students have been shortlisted for the technical interview:',
    '1. Aarav Sharma - PES1202200001',
    '2. Priya Iyer - PES1202200002',
    '3. Rahul Verma - PES1202200003',
    '',
    'Regards,',
    'Placement Cell',
  ].join('\n');

  assert.equal(detectEmailType(subject, body), 'SHORTLIST');

  const parsed = parseShortlist(subject, cleanEmailBody(body), 'email-789', '2026-09-20');
  assert.ok(parsed, 'shortlist should parse');
  assert.equal(parsed.company_name, 'Acme Corp');
  assert.equal(parsed.student_count, 3);
  assert.equal(parsed.students?.length, 3);
  assert.equal(parsed.students?.[0].name, 'Aarav Sharma');
  assert.equal(parsed.students?.[0].usn, 'PES1202200001');
  assert.equal(parsed.students?.[2].usn, 'PES1202200003');
});

test('email metadata Date header is never used as the event date', () => {
  // A forwarded email whose only "Date:" line is the header block date.
  const body = [
    'From: HR <hr@example.com>',
    'Date: Mon, 22 Sep 2026 10:00:00 +0530',
    'Subject: Procedure for Drive | Global Tech',
    'To: placement@pes.edu',
    '',
    'Dear Students,',
    '',
    'Please note the following procedure for the Global Tech drive.',
    'Round 1: Online Assessment on 1st October 2026',
    '',
    'Regards,',
    'Placement Cell',
  ].join('\n');

  const cleaned = cleanEmailBody(body);
  assert.ok(!cleaned.includes('22 Sep'));

  const parsed = parsePlacementEvent(
    'Procedure for Drive | Global Tech',
    cleaned,
    'email-abc'
  );
  assert.ok(parsed, 'event should parse');
  assert.equal(parsed.event_date, '2026-10-01');
});

test('description is the substantive paragraph, not headers/salutations/boilerplate', () => {
  const subject = 'Placement Drive | Freshworks | Support Engineer';
  const body = [
    'Hello Students,',
    '',
    'Freshworks is organizing a placement drive for the role of Support Engineer.',
    'The drive will be conducted online on the scheduled date.',
    '',
    'Date: 5th October 2026',
    'Role: Support Engineer',
    'Eligibility: 2027 batch',
    '',
    'Thanks,',
    'Placement Cell',
  ].join('\n');

  const parsed = parsePlacementEvent(subject, body, 'email-xyz');
  assert.ok(parsed, 'event should parse');
  assert.equal(parsed.company_name, 'Freshworks');
  assert.ok(parsed.description?.startsWith('Freshworks is organizing'));
  assert.ok(!parsed.description?.includes('Eligibility:'));
});

test('student list extraction handles numbered and pipe-separated formats', () => {
  const body = [
    'Shortlisted candidates:',
    '1. Akash Kumar | PES1202200041',
    '2. Neha Reddy | PES1202200042',
    '3. Karthik R | PES1202200043',
  ].join('\n');

  const students = extractStudents(body);
  assert.equal(students.length, 3);
  assert.equal(students[0].name, 'Akash Kumar');
  assert.equal(students[0].usn, 'PES1202200041');
  assert.equal(students[2].name, 'Karthik R');
});

test('earliest event stage wins: Assessment before Technical Interview → OA; interview-only → TECHNICAL_INTERVIEW', () => {
  const oaFirst = parsePlacementEvent(
    'Drive | Orbit Labs',
    ['Date: 1 Nov 2026', 'Online Assessment will be followed by a Technical Interview.'].join('\n'),
    'e1'
  );
  assert.ok(oaFirst);
  assert.equal(oaFirst.event_type, 'OA');

  const interviewOnly = parsePlacementEvent(
    'Technical Interview | Torch Corp | Backend Engineer',
    ['Date: 5 Nov 2026', 'Technical Interview round of 2 hours.'].join('\n'),
    'e2'
  );
  assert.ok(interviewOnly);
  assert.equal(interviewOnly.event_type, 'TECHNICAL_INTERVIEW');
});

test('registration link prefers an explicit labeled form over tracking pixels', () => {
  const subject = 'Drive | Signup Corp | Analyst';
  const body = [
    'Dear Students,',
    '',
    'Please register for the Signup Corp drive.',
    'Registration Link: https://forms.gle/signup123',
    'Date: 10th November 2026',
    '',
    'This is an automated email. Unsubscribe: https://unsubscribe.example.com/a?e=123',
  ].join('\n');

  const parsed = parsePlacementEvent(subject, body, 'email-reg');
  assert.ok(parsed);
  assert.equal(parsed.additional_details?.registration_url, 'https://forms.gle/signup123');
});

test('missing company or event date → parse returns null (no draft)', () => {
  const noCompany = parsePlacementEvent(
    'Placement Drive Notification',
    'Date: 10 Nov 2026, Dear Students, please see the attached.',
    'e3'
  );
  assert.equal(noCompany, null);

  const noDate = parsePlacementEvent(
    'Drive | Mystery Corp',
    'Dear Students, Mystery Corp will visit campus soon.',
    'e4'
  );
  assert.equal(noDate, null);
});

test('dedup key is stable across case/whitespace/punctuation', () => {
  const parsed = parsePlacementEvent(
    'Drive | Acme Corp | SDE',
    ['Date: 29 Sep 2026', 'Time: 9:00 - 11:00 AM'].join('\n'),
    'e5'
  );
  assert.ok(parsed);
  const key = buildEventDedupKey(parsed);
  assert.ok(key.includes('acme'));
  assert.equal(
    buildEventDedupKey({
      company_name: 'ACME Corp',
      role: 'SDE',
      event_type: 'OA',
      event_date: '2026-09-29',
      start_time: '09:00',
    }),
    key
  );
});