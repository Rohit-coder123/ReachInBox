import { EmailParser } from '../src/utils/email-parser';

describe('EmailParser Unit Tests', () => {
  it('should parse valid emails from CSV format with headers', () => {
    const csvContent = `Email,Name
john@example.com,John Doe
jane.doe@company.org,Jane Doe
invalid-email,Bad User
alex@startup.io,Alex Smith`;

    const result = EmailParser.parseTextOrCsv(csvContent);

    expect(result.validCount).toBe(3);
    expect(result.invalidCount).toBe(1);
    expect(result.duplicateCount).toBe(0);
    expect(result.valid).toEqual([
      { email: 'john@example.com', name: 'John Doe' },
      { email: 'jane.doe@company.org', name: 'Jane Doe' },
      { email: 'alex@startup.io', name: 'Alex Smith' },
    ]);
  });

  it('should detect and remove duplicate emails', () => {
    const textContent = `user1@example.com
user2@example.com
user1@example.com
user3@example.com
USER2@EXAMPLE.COM`;

    const result = EmailParser.parseTextOrCsv(textContent);

    expect(result.validCount).toBe(3);
    expect(result.duplicateCount).toBe(2);
    expect(result.invalidCount).toBe(0);
  });

  it('should flag malformed email addresses', () => {
    const badContent = `not-an-email
@missinguser.com
missingdomain@.com
valid.user@reachinbox.ai`;

    const result = EmailParser.parseTextOrCsv(badContent);

    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(3);
    expect(result.valid[0].email).toBe('valid.user@reachinbox.ai');
  });

  it('should handle semicolon and tab delimited content', () => {
    const semicolonContent = `email;name\nalpha@reachinbox.ai;Alpha\nbeta@reachinbox.ai;Beta`;
    const result = EmailParser.parseTextOrCsv(semicolonContent);

    expect(result.validCount).toBe(2);
    expect(result.valid[0].email).toBe('alpha@reachinbox.ai');
    expect(result.valid[1].email).toBe('beta@reachinbox.ai');
  });
});
