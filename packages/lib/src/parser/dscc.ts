import { z } from 'zod';

export const DsccParsedSchema = z.object({
  dsccReceivedAt: z.date().nullable(),
  dsccDeployedAt: z.date().nullable(),
  clientName: z.string().nullable(),
  locationText: z.string().nullable(),
  dsccRef: z.string().nullable(),
});
export type DsccParsed = z.infer<typeof DsccParsedSchema>;

const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?:\.(\d{2}))?/;

export function parseDsccSms(input: string): DsccParsed {
  const receivedMatch = input.match(/case\s+(.*?)\.\s+Name/i);
  const deployedMatch = input.match(/Deployed:\s+([^\.]+)\./i);
  const nameMatch = input.match(/Name:\s*([^\.]+)\./i);
  const locationMatch = input.match(/Location:\s*([^\.]+)\./i);
  const refMatch = input.match(/Ref\s*No:\s*([^\.]+)\./i);

  const parseDate = (s?: string | null) => {
    if (!s) return null;
    const m = s.match(dateRegex);
    if (!m) return null;
    const [_, dd, mm, yyyy, HH, MM] = m;
    return new Date(`${yyyy}-${mm}-${dd}T${HH}:${MM}:00Z`);
  };

  return {
    dsccReceivedAt: parseDate(receivedMatch?.[1] || null),
    dsccDeployedAt: parseDate(deployedMatch?.[1] || null),
    clientName: nameMatch?.[1]?.trim() || null,
    locationText: locationMatch?.[1]?.trim() || null,
    dsccRef: refMatch?.[1]?.trim() || null,
  };
}
