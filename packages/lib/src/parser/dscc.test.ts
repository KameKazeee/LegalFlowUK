import { describe, it, expect } from 'vitest';
import { parseDsccSms } from './dscc';

describe('parseDsccSms', () => {
  it('parses canonical example', () => {
    const input =
      'DSCC case 22/10/2025 16:18.00. Name: KANE HALL. Location: WORCESTER, WORCESTERSHIRE. Ref No: 251050810A. Deployed: 22/10/2025 16:21.00.';
    const out = parseDsccSms(input);
    expect(out.clientName).toBe('KANE HALL');
    expect(out.locationText).toContain('WORCESTER');
    expect(out.dsccRef).toBe('251050810A');
    expect(out.dsccReceivedAt).toBeInstanceOf(Date);
    expect(out.dsccDeployedAt).toBeInstanceOf(Date);
  });

  it('handles missing deployed', () => {
    const input =
      'DSCC case 22/10/2025 16:18.00. Name: JANE DOE. Location: HEREFORD. Ref No: 12345.';
    const out = parseDsccSms(input);
    expect(out.dsccDeployedAt).toBeNull();
  });

  it('handles lowercase labels and extra spaces', () => {
    const input =
      'dscc case 22/10/2025 01:02.00. name: John Smith. location: Bristol. ref no: ABC. deployed: 22/10/2025 02:03.00.';
    const out = parseDsccSms(input);
    expect(out.clientName).toBe('John Smith');
  });

  it('returns nulls on unknown', () => {
    const out = parseDsccSms('random text');
    expect(out.clientName).toBeNull();
    expect(out.dsccRef).toBeNull();
  });

  it('parses different date layouts if present', () => {
    const input =
      'DSCC case 01/01/2025 00:00.00. Name: A B. Location: C. Ref No: X. Deployed: 01/01/2025 00:10.00.';
    const out = parseDsccSms(input);
    expect(out.dsccReceivedAt?.getUTCMinutes()).toBe(0);
    expect(out.dsccDeployedAt?.getUTCMinutes()).toBe(10);
  });
});
