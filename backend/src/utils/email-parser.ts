export interface EmailParseResult {
  valid: Array<{ email: string; name?: string }>;
  invalid: Array<{ raw: string; reason: string }>;
  totalCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
}

// RFC 5322 compliant regex for robust email validation
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class EmailParser {
  /**
   * Parse and validate email addresses from raw text or CSV content
   */
  static parseTextOrCsv(content: string): EmailParseResult {
    const lines = content.split(/\r?\n/);
    const seenEmails = new Set<string>();
    const valid: Array<{ email: string; name?: string }> = [];
    const invalid: Array<{ raw: string; reason: string }> = [];
    let duplicateCount = 0;
    let totalCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip header row if line is exactly a known header title or a CSV header line
      if (i === 0) {
        const clean = line.toLowerCase();
        if (
          clean === 'email' ||
          clean === 'emails' ||
          clean === 'recipient' ||
          clean === 'recipients' ||
          clean === 'email address' ||
          (clean.includes(',') && clean.includes('email'))
        ) {
          continue;
        }
      }

      // Handle CSV format: email,name or "name","email"
      const parts = line.split(/[,;\t]/).map((p) => p.replace(/^["']|["']$/g, '').trim());

      let extractedEmail = '';
      let extractedName: string | undefined = undefined;

      // Detect which column is the email
      for (const part of parts) {
        if (part.includes('@')) {
          extractedEmail = part.toLowerCase();
        } else if (part.length > 0 && !extractedName) {
          extractedName = part;
        }
      }

      if (!extractedEmail) {
        // Try regex match for any email within the line
        const match = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match) {
          extractedEmail = match[0].toLowerCase();
        }
      }

      totalCount++;

      if (!extractedEmail) {
        invalid.push({ raw: line, reason: 'No email address found in line' });
        continue;
      }

      if (!EMAIL_REGEX.test(extractedEmail)) {
        invalid.push({ raw: extractedEmail, reason: 'Invalid email syntax format' });
        continue;
      }

      if (seenEmails.has(extractedEmail)) {
        duplicateCount++;
        continue;
      }

      seenEmails.add(extractedEmail);
      valid.push({
        email: extractedEmail,
        name: extractedName || undefined,
      });
    }

    return {
      valid,
      invalid,
      totalCount,
      validCount: valid.length,
      invalidCount: invalid.length,
      duplicateCount,
    };
  }
}
