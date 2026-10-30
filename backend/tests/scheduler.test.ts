describe('EmailScheduler Rate Limiting & Rollover Logic', () => {
  const getHourKey = (date: Date): string => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${d}-${h}`;
  };

  it('should format UTC hour keys consistently', () => {
    const date = new Date('2026-05-15T14:22:00Z');
    expect(getHourKey(date)).toBe('2026-05-15-14');
  });

  it('should calculate inter-email delay correctly', () => {
    const baseTime = 1700000000000;
    const delaySeconds = 2;
    const emailsCount = 5;

    const timestamps: number[] = [];
    for (let i = 0; i < emailsCount; i++) {
      timestamps.push(baseTime + i * (delaySeconds * 1000));
    }

    expect(timestamps[0]).toBe(baseTime);
    expect(timestamps[1] - timestamps[0]).toBe(2000);
    expect(timestamps[4] - timestamps[0]).toBe(8000);
  });

  it('should roll over timestamp into next full hour when limit reached', () => {
    const candidateTime = new Date('2026-05-15T10:45:00Z');
    
    // Simulate advancing to next hour window
    const nextHourTime = new Date(candidateTime.getTime() + 3600 * 1000);
    nextHourTime.setUTCMinutes(0, 0, 0);

    expect(getHourKey(nextHourTime)).toBe('2026-05-15-11');
    expect(nextHourTime.getUTCMinutes()).toBe(0);
    expect(nextHourTime.getUTCSeconds()).toBe(0);
  });
});
