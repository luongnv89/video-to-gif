const {
  parseTime,
  parseFraction,
  SUPPORTED_FORMATS,
  QUALITY_PRESETS,
} = require('../src/video2gif');

describe('parseTime', () => {
  describe('with number input', () => {
    it('should return the number as-is for positive numbers', () => {
      expect(parseTime(30)).toBe(30);
      expect(parseTime(0)).toBe(0);
      expect(parseTime(1.5)).toBe(1.5);
    });

    it('should throw error for negative numbers', () => {
      expect(() => parseTime(-1)).toThrow('Time cannot be negative');
      expect(() => parseTime(-100)).toThrow('Time cannot be negative');
    });
  });

  describe('with seconds format (SS)', () => {
    it('should parse seconds string correctly', () => {
      expect(parseTime('30')).toBe(30);
      expect(parseTime('0')).toBe(0);
      expect(parseTime('120')).toBe(120);
    });
  });

  describe('with minutes:seconds format (MM:SS)', () => {
    it('should parse MM:SS correctly', () => {
      expect(parseTime('1:30')).toBe(90);
      expect(parseTime('0:30')).toBe(30);
      expect(parseTime('10:00')).toBe(600);
      expect(parseTime('2:45')).toBe(165);
    });
  });

  describe('with hours:minutes:seconds format (HH:MM:SS)', () => {
    it('should parse HH:MM:SS correctly', () => {
      expect(parseTime('1:00:00')).toBe(3600);
      expect(parseTime('0:01:30')).toBe(90);
      expect(parseTime('2:30:45')).toBe(9045);
      expect(parseTime('0:00:30')).toBe(30);
    });
  });

  describe('with invalid input', () => {
    it('should throw error for null/undefined', () => {
      expect(() => parseTime(null)).toThrow('Invalid time format');
      expect(() => parseTime(undefined)).toThrow('Invalid time format');
    });

    it('should throw error for empty string', () => {
      expect(() => parseTime('')).toThrow('Invalid time format');
    });

    it('should throw error for invalid format', () => {
      expect(() => parseTime('abc')).toThrow('Invalid time format');
      expect(() => parseTime('1:2:3:4')).toThrow('Invalid time format');
    });

    it('should throw error for negative values in time string', () => {
      expect(() => parseTime('-1:30')).toThrow('Invalid time format');
      expect(() => parseTime('1:-30')).toThrow('Invalid time format');
    });
  });
});

describe('parseFraction', () => {
  describe('with fraction input', () => {
    it('should parse fraction strings correctly', () => {
      expect(parseFraction('30000/1001')).toBeCloseTo(29.97, 2);
      expect(parseFraction('24000/1001')).toBeCloseTo(23.976, 2);
      expect(parseFraction('30/1')).toBe(30);
      expect(parseFraction('60/2')).toBe(30);
    });

    it('should handle zero denominator gracefully', () => {
      // Division by zero should fall through to parseFloat
      expect(parseFraction('30/0')).toBe(30);
    });
  });

  describe('with plain number input', () => {
    it('should parse plain number strings', () => {
      expect(parseFraction('30')).toBe(30);
      expect(parseFraction('29.97')).toBeCloseTo(29.97, 2);
      expect(parseFraction('24')).toBe(24);
    });

    it('should handle numeric input', () => {
      expect(parseFraction(30)).toBe(30);
      expect(parseFraction(29.97)).toBeCloseTo(29.97, 2);
    });
  });

  describe('with invalid input', () => {
    it('should return null for null/undefined', () => {
      expect(parseFraction(null)).toBeNull();
      expect(parseFraction(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseFraction('')).toBeNull();
    });

    it('should return null for non-numeric strings', () => {
      expect(parseFraction('abc')).toBeNull();
      expect(parseFraction('not-a-number')).toBeNull();
    });
  });
});

describe('SUPPORTED_FORMATS', () => {
  it('should include mp4 format', () => {
    expect(SUPPORTED_FORMATS).toContain('.mp4');
  });

  it('should include mov format', () => {
    expect(SUPPORTED_FORMATS).toContain('.mov');
  });

  it('should have exactly 2 supported formats', () => {
    expect(SUPPORTED_FORMATS).toHaveLength(2);
  });
});

describe('QUALITY_PRESETS', () => {
  it('should have low, medium, and high presets', () => {
    expect(QUALITY_PRESETS).toHaveProperty('low');
    expect(QUALITY_PRESETS).toHaveProperty('medium');
    expect(QUALITY_PRESETS).toHaveProperty('high');
  });

  it('should have scale property for all presets', () => {
    expect(QUALITY_PRESETS.low).toHaveProperty('scale');
    expect(QUALITY_PRESETS.medium).toHaveProperty('scale');
    expect(QUALITY_PRESETS.high).toHaveProperty('scale');
  });

  it('should have dither property for all presets', () => {
    expect(QUALITY_PRESETS.low).toHaveProperty('dither');
    expect(QUALITY_PRESETS.medium).toHaveProperty('dither');
    expect(QUALITY_PRESETS.high).toHaveProperty('dither');
  });

  it('should use lanczos scaling for all presets', () => {
    expect(QUALITY_PRESETS.low.scale).toBe('lanczos');
    expect(QUALITY_PRESETS.medium.scale).toBe('lanczos');
    expect(QUALITY_PRESETS.high.scale).toBe('lanczos');
  });
});
