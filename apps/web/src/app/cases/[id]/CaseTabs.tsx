"use client";

import { useEffect, useState } from "react";

type CaseData = {
  id: string;
  lfNumber?: number;
  dsccRef: string | null;
  station: string | null;
  area: string | null;
  status: string;
  createdAt: string;
  dsccReceivedAt: string | null;
  dsccDeployedAt: string | null;
  client: { firstName: string | null; lastName: string | null } | null;
  assignedTo: { id: string; name: string | null } | null;
  Attendances: Array<{
    id: string;
    arrivalAt: string | null;
    departAt: string | null;
    outcomeCode: string | null;
    claimCode: string | null;
    notes: string | null;
    mileageKm?: number | null;
    attendanceType?: string | null;
    initialInstructionSource?: string | null;
    rep: { name: string | null } | null;
    AppropriateAdult?: Array<{ required: boolean; reason: string | null; name: string | null; relation: string | null; phone: string | null }>;
    InterpreterUse?: Array<{ required: boolean; language: string | null }>;
    Disclosure?: Array<{ providedAt: string | null; source: string | null; summary: string | null }>;
    Advice?: Array<{ crmEligible?: boolean; crm2Signed?: boolean; notes?: string | null }>;
    Interview?: Array<{ startAt: string | null; endAt: string | null; cautionExplained?: boolean; replyType?: string | null; summary?: string | null }>;
    TimeEntry?: Array<{ fromTime: string | null; toTime: string | null; category: string; details: string | null }>;
    AttendanceOutcome?: Array<{ outcomeCode: string | null; decidedAt: string | null; notes?: string | null }>;
  }>;
  Documents: Array<{ id: string; title: string; type: string; createdAt: string }>;
  Invoices: Array<{ id: string; total: any; status: string; createdAt: string }>;
  Offences?: Array<{ offence: { description: string } }>;
};

const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'medium', hour12: false });

export default function CaseTabs({ data }: { data: CaseData }) {
  const [tab, setTab] = useState<
    | "case-info"
    | "attendance"
    | "client"
    | "support"
    | "eligibility"
    | "pre-interview"
    | "legal-advice"
    | "police-interview"
    | "outcome"
    | "logistics"
    | "time-travel"
    | "notes-signoff"
  >("case-info");
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [attnType, setAttnType] = useState<"ua" | "vol" | "iv" | null>(null);
  const [initFrom, setInitFrom] = useState<"dscc" | "client" | "third" | null>(null);
  const persistEnabled = false;
  const saveField = async (patch: any) => {
    if (!persistEnabled) return;
    try {
      await fetch(`/api/attendance/${data.id}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/rawnotes/${data.id}`);
        if (res.ok) {
          const j = await res.json();
          if (j?.exists && j?.sourceFile) setSourceFile(j.sourceFile as string);
        }
      } catch {}
    };
    load();
  }, [data.id]);

  // Initialize radio state from attendance values
  useEffect(() => {
    const a = data.Attendances?.[0] as any;
    if (a?.attendanceType) {
      const map: Record<string, any> = {
        UNDER_ARREST: 'ua',
        VOLUNTARY: 'vol',
        INITIALLY_VOLUNTARY_ARRESTED_AT_STATION: 'iv',
      };
      setAttnType(map[a.attendanceType] ?? null);
    }
    if (a?.initialInstructionSource) {
      const map: Record<string, any> = { DSCC: 'dscc', CLIENT: 'client', THIRD_PARTY: 'third' };
      setInitFrom(map[a.initialInstructionSource] ?? null);
    }
    // Support defaults from parsed
    if (aa) {
      setAaRequired(aa.required ? 'yes' : 'no');
      if (aa.reason) {
        const r = aa.reason.toLowerCase();
        if (r.includes('under 17') || r.includes('under17')) setAaReasonType('under17');
        else if (r.includes('vulnerable')) setAaReasonType('vulnerable');
        else setAaReasonType('other');
        setAaReason(aa.reason || "");
      }
      const details = [aa.name, aa.relation, aa.phone].filter(Boolean).join(' – ');
      if (details) setAaDetails(details);
    }
    if (interp) {
      setInterpreterReq(interp.required ? 'yes' : 'no');
      if (interp.language) setInterpreterLang(interp.language);
    }
    // Eligibility defaults from parsed
    if (adv) {
      setCrmEligible(adv.crmEligible ? 'yes' : 'no');
      setCrm2Signed(adv.crm2Signed ? 'yes' : 'no');
    }
    // Police interview defaults
    if (iv) {
      setInterviewSummary(iv.summary || "");
      if (iv.replyType) {
        const map: Record<string, any> = {
          SOME: 'Answered',
          NO_COMMENT: 'No Comment',
          PREPARED_NC: 'Prepared Statement',
          MIXED: 'Mixed'
        };
        setClientResp(map[iv.replyType] ?? null);
      }
      setAaPresent(iv.cautionExplained !== undefined ? null : null); // leave blank; caution shown elsewhere
    }
  }, [data.Attendances]);

  const clientName = [data.client?.firstName, data.client?.lastName]
    .filter(Boolean)
    .join(" ") || "-";


  const Panel: React.FC<{ children: any }> = ({ children }) => (
    <div className="mt-4 max-h-[70vh] overflow-y-auto pr-2">{children}</div>
  );

  const a0 = data.Attendances?.[0];
  // Notes & Sign-off UI-only state
  const [summaryNotes, setSummaryNotes] = useState<string>("");
  const [solicitorSig, setSolicitorSig] = useState<string>((a0 as any)?.rep?.name || "");
  const [completionAt, setCompletionAt] = useState<string>("");
  const [versionInfo, setVersionInfo] = useState<string>("v1");
  const dt = (v?: string | null) => (v ? fmt.format(new Date(v)) : "-");
  const tOrDash = (v?: string | null) => (v ? v : "-");
  const aa = (a0 as any)?.AppropriateAdult?.[0];
  const interp = (a0 as any)?.InterpreterUse?.[0];
  const disc = (a0 as any)?.Disclosure?.[0];
  const adv = (a0 as any)?.Advice?.[0];
  const iv = (a0 as any)?.Interview?.[0];
  const outc = (a0 as any)?.AttendanceOutcome?.[0];
  const timeEntries: Array<any> = (a0 as any)?.TimeEntry || [];

  // Support tab UI-only state
  const [aaRequired, setAaRequired] = useState<null | 'yes' | 'no'>(null);
  const [aaReasonType, setAaReasonType] = useState<null | 'under17' | 'vulnerable' | 'other'>(null);
  const [aaReason, setAaReason] = useState<string>("");
  const [aaDetails, setAaDetails] = useState<string>("");
  const [interpreterReq, setInterpreterReq] = useState<null | 'yes' | 'no'>(null);
  const [interpreterLang, setInterpreterLang] = useState<string>("");

  // Eligibility tab UI-only state
  const [sufficientBenefit, setSufficientBenefit] = useState<null | 'yes' | 'no'>(null);
  const [benefitReason, setBenefitReason] = useState<string>("");
  const [crmEligible, setCrmEligible] = useState<null | 'yes' | 'no'>(null);
  const [crm2Signed, setCrm2Signed] = useState<null | 'yes' | 'no'>(null);
  const [crm2Reason, setCrm2Reason] = useState<string>("");

  // Pre-Interview UI-only state
  const [sigComments, setSigComments] = useState<null | 'yes' | 'no'>(null);
  const [sigCommentsText, setSigCommentsText] = useState<string>("");
  const [sampleIntimate, setSampleIntimate] = useState<boolean>(false);
  const [sampleNonIntimate, setSampleNonIntimate] = useState<boolean>(false);
  const [sampleOther, setSampleOther] = useState<boolean>(false);
  const [sampleOtherText, setSampleOtherText] = useState<string>("");
  const [prevConv, setPrevConv] = useState<null | 'yes' | 'no'>(null);
  const [searchPrem, setSearchPrem] = useState<null | 'yes' | 'no'>(null);
  const [coAccused, setCoAccused] = useState<string>("");

  // Legal Advice UI-only state
  const [prevAdvice, setPrevAdvice] = useState<null | 'yes' | 'no'>(null);
  const [prevAdviceText, setPrevAdviceText] = useState<string>("");
  const [disclosureReview, setDisclosureReview] = useState<string>(adv?.notes || "");
  const [clientAccount, setClientAccount] = useState<string>("");
  const [solicitorAdvice, setSolicitorAdvice] = useState<string>("");
  const [approach, setApproach] = useState<'Prepared Statement' | 'No Comment' | 'Full Interview' | 'Mixed' | null>(null);

  // Police Interview UI-only state
  const [aaPresent, setAaPresent] = useState<null | 'yes' | 'no'>(null);
  const [officers, setOfficers] = useState<string>("");
  const [clientResp, setClientResp] = useState<'Answered' | 'No Comment' | 'Prepared Statement' | 'Mixed' | null>(null);
  const [solicitorInterventions, setSolicitorInterventions] = useState<null | 'yes' | 'no'>(null);
  const [interviewSummary, setInterviewSummary] = useState<string>(iv?.summary || "");

  // Outcome UI-only state
  const [outcomeSel, setOutcomeSel] = useState<'NFA' | 'CHARGE' | 'BAIL' | 'RUI' | 'OTHER' | null>(null);
  const [clientInformed, setClientInformed] = useState<null | 'yes' | 'no'>(null);
  const [nextSteps, setNextSteps] = useState<string>("");
  const [followUps, setFollowUps] = useState<string>("");

  // Time & Travel UI-only state
  type TRow = { category: 'Travel' | 'Waiting' | 'Attendance'; fromTime: string; toTime: string; details: string };
  const [timeRows, setTimeRows] = useState<TRow[]>([]);
  const [mileage, setMileage] = useState<string>(a0?.mileageKm != null ? String(a0.mileageKm) : "");
  useEffect(() => {
    const rows: TRow[] = (timeEntries || []).map((t: any) => ({
      category: (t.category === 'Travel' || t.category === 'Waiting' || t.category === 'Attendance') ? t.category : 'Attendance',
      fromTime: t.fromTime ? new Date(t.fromTime).toISOString().slice(0,16) : '',
      toTime: t.toTime ? new Date(t.toTime).toISOString().slice(0,16) : '',
      details: t.details || '',
    }));
    setTimeRows(rows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  return (
    <div className="w-full grid grid-cols-12 gap-6">
      <aside className="col-span-12 md:col-span-3">
        <div className="sticky top-20 md:top-24">
          <nav className="border rounded-md divide-y md:divide-y-0 md:divide-x-0">
            {[
              { key: "case-info", label: "Case Information" },
              { key: "attendance", label: "Attendance Details" },
              { key: "client", label: "Client Information" },
              { key: "support", label: "Support & Representation" },
              { key: "eligibility", label: "Eligibility & Authorisation" },
              { key: "pre-interview", label: "Disclosure & Pre-Interview" },
              { key: "legal-advice", label: "Legal Advice & Instructions" },
              { key: "police-interview", label: "Police Interview Details" },
              { key: "outcome", label: "Outcome & Actions" },
              { key: "logistics", label: "Logistics / Documents" },
              { key: "time-travel", label: "Time & Travel" },
              { key: "notes-signoff", label: "Notes & Sign-off" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`block w-full text-left px-3 py-2 text-sm border-b last:border-b-0 md:border-b md:last:border-b-0 hover:bg-gray-50 ${
                  tab === t.key ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <section className="col-span-12 md:col-span-9">

      {tab === "case-info" && (
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div><span className="font-medium">Court Rep (Fee Earner):</span> -</div>
              <div><span className="font-medium">Date:</span> {dt(data.createdAt)}</div>
              <div>
                <span className="font-medium">UFN / File Reference:</span>
                <input className="ml-2 border rounded px-2 py-1" placeholder="UFN or file ref" />
              </div>
              <div><span className="font-medium">DSCC Reference:</span> {data.dsccRef || data.id.slice(0,8)}</div>
              <div><span className="font-medium">Client:</span> {(data.client?.firstName || data.client?.lastName) ? `${data.client?.firstName ?? ''} ${data.client?.lastName ?? ''}`.trim() : '-'}</div>
              <div><span className="font-medium">Station:</span> {tOrDash(data.station)}</div>
              <div><span className="font-medium">Custody Reference:</span> -</div>
            </div>
            <div className="space-y-1">
              <div>
                <span className="font-medium mr-2">Client’s Attendance:</span>
                <div className="mt-1 grid grid-cols-1 gap-1">
                  <label className="inline-flex items-center gap-2"><input type="radio" name="attnType" className="h-4 w-4" checked={attnType === 'ua'} onChange={() => { setAttnType('ua'); saveField({ attendanceType: 'UNDER_ARREST' }); }} /><span>Under Arrest</span></label>
                  <label className="inline-flex items-center gap-2"><input type="radio" name="attnType" className="h-4 w-4" checked={attnType === 'vol'} onChange={() => { setAttnType('vol'); saveField({ attendanceType: 'VOLUNTARY' }); }} /><span>Voluntary</span></label>
                  <label className="inline-flex items-center gap-2"><input type="radio" name="attnType" className="h-4 w-4" checked={attnType === 'iv'} onChange={() => { setAttnType('iv'); saveField({ attendanceType: 'INITIALLY_VOLUNTARY_ARRESTED_AT_STATION' }); }} /><span>Initially voluntary, arrested at station</span></label>
                </div>
              </div>
              <div>
                <span className="font-medium mr-2">Initial Instructions from:</span>
                <div className="mt-1 grid grid-cols-3 gap-2 max-w-md">
                  <label className="inline-flex items-center gap-2"><input type="radio" name="initFrom" className="h-4 w-4" checked={initFrom === 'dscc'} onChange={() => { setInitFrom('dscc'); saveField({ initialInstructionSource: 'DSCC' }); }} /><span>DSCC</span></label>
                  <label className="inline-flex items-center gap-2"><input type="radio" name="initFrom" className="h-4 w-4" checked={initFrom === 'client'} onChange={() => { setInitFrom('client'); saveField({ initialInstructionSource: 'CLIENT' }); }} /><span>Client</span></label>
                  <label className="inline-flex items-center gap-2"><input type="radio" name="initFrom" className="h-4 w-4" checked={initFrom === 'third'} onChange={() => { setInitFrom('third'); saveField({ initialInstructionSource: 'THIRD_PARTY' }); }} /><span>Third Party</span></label>
                </div>
              </div>
              <div><span className="font-medium">Third Party Details:</span> -</div>
              <div><span className="font-medium">DSCC Received:</span> {data.dsccReceivedAt ? fmt.format(new Date(data.dsccReceivedAt)) : '-'}</div>
              <div><span className="font-medium">DSCC Deployed:</span> {data.dsccDeployedAt ? fmt.format(new Date(data.dsccDeployedAt)) : '-'}</div>
              <div>
                <span className="font-medium">Original Form:</span>{' '}
                {(() => {
                  const originalDoc = data.Documents.find(d => d.title.toLowerCase().endsWith('.docx') || d.title.toLowerCase().endsWith('.pdf'));
                  if (originalDoc) {
                    return (
                      <a href={`/api/documents/${originalDoc.id}/download`} className="text-blue-700 underline" download>
                        {originalDoc.title}
                      </a>
                    );
                  }
                  if (sourceFile) {
                    return (
                      <a href={`/api/rawnotes/${data.id}/download?file=${encodeURIComponent(sourceFile)}`} className="text-blue-700 underline" download>
                        {sourceFile}
                      </a>
                    );
                  }
                  return '-';
                })()}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {tab === "attendance" && (
        <Panel>
          <div className="border rounded divide-y">
            {data.Attendances.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No attendances yet.</div>
            )}
            <div className="p-3 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div><span className="font-medium">Time Agreed to Attend:</span> -</div>
                <div><span className="font-medium">Time Attended Station:</span> {dt(a0?.arrivalAt)}</div>
                <div><span className="font-medium">Time Attended Upon Client:</span> -</div>
                <div><span className="font-medium">Within 45 Minutes</span> -</div>
              </div>
              <div className="space-y-1">
                <div><span className="font-medium">Rep:</span> {a0?.rep?.name || '-'}</div>
                <div><span className="font-medium">Outcome Code:</span> {a0?.outcomeCode || '-'}</div>
                <div><span className="font-medium">Claim Code:</span> {a0?.claimCode || '-'}</div>
              </div>
            </div>
            {data.Attendances.map((a) => (
              <div key={a.id} className="p-3 text-sm border-t">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.rep?.name || 'Rep'}</div>
                  <div className="text-gray-500">
                    <div>Start: {a.arrivalAt ? fmt.format(new Date(a.arrivalAt)) : '-'}</div>
                    <div>Finish: {a.departAt ? fmt.format(new Date(a.departAt)) : '-'}</div>
                  </div>
                </div>
                <div className="text-gray-600">Outcome: {a.outcomeCode || '-'} | Claim: {a.claimCode || '-'}</div>
                {a.notes && (
                  <div className="mt-1 whitespace-pre-wrap">
                    <div className="max-h-48 overflow-y-auto p-2 bg-gray-50 rounded">{a.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "client" && (
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div>
                <span className="font-medium">Full Name:</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input className="border rounded px-2 py-1" placeholder="First name" defaultValue={data.client?.firstName || ''} />
                  <input className="border rounded px-2 py-1" placeholder="Surname" defaultValue={data.client?.lastName || ''} />
                </div>
              </div>
              <div>
                <span className="font-medium mr-2">Title:</span>
                {['Mr','Mrs','Miss','Ms','Mx','Other'].map(t => (
                  <label key={t} className="inline-flex items-center gap-2 mr-3"><input type="radio" name="title" className="h-4 w-4" /><span>{t}</span></label>
                ))}
              </div>
              <div>
                <span className="font-medium mr-2">Gender:</span>
                {['Male','Female','Other','Prefer not to say'].map(g => (
                  <label key={g} className="inline-flex items-center gap-2 mr-3"><input type="radio" name="gender" className="h-4 w-4" /><span>{g}</span></label>
                ))}
              </div>
              <div>
                <span className="font-medium">Date of Birth:</span>
                <input type="date" className="ml-2 border rounded px-2 py-1" />
              </div>
              <div>
                <span className="font-medium">Address:</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={4} placeholder="Address" />
              </div>
              <div>
                <span className="font-medium">Date and Time of Arrest:</span>
                <input type="datetime-local" className="ml-2 border rounded px-2 py-1" />
              </div>
              <div>
                <span className="font-medium">Relevant Time:</span>
                <input type="datetime-local" className="ml-2 border rounded px-2 py-1" />
              </div>
              <div>
                <span className="font-medium">Offence(s):</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={3} placeholder="List offences" />
              </div>
              <div>
                <span className="font-medium">Place of Arrest:</span>
                <input className="ml-2 border rounded px-2 py-1" placeholder="Place of arrest" />
              </div>
              <div>
                <span className="font-medium">Officer in Charge:</span>
                <input className="ml-2 border rounded px-2 py-1" placeholder="Name / Badge / Station" />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Telephone Number(s):</span>
                <input className="ml-2 border rounded px-2 py-1 w-full mt-1" placeholder="Phones" />
              </div>
              <div>
                <span className="font-medium">National Insurance Number:</span>
                <input className="ml-2 border rounded px-2 py-1" placeholder="NI Number" />
              </div>
              <div>
                <span className="font-medium">Income Source:</span>
                <input className="ml-2 border rounded px-2 py-1" placeholder="Income source" />
              </div>
              <div>
                <span className="font-medium mr-2">Identification Issue</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="idIssue" className="h-4 w-4" /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="idIssue" className="h-4 w-4" /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium">Health Conditions / Medication</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={3} placeholder="Health details" />
              </div>
              <div>
                <span className="font-medium mr-2">Mistreatment/Complaint Against Police</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="complaint" className="h-4 w-4" /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="complaint" className="h-4 w-4" /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium mr-2">Any Injuries</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="injuries" className="h-4 w-4" /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="injuries" className="h-4 w-4" /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium mr-2">Defence Witnesses or Alibis</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="witnesses" className="h-4 w-4" /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="witnesses" className="h-4 w-4" /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium mr-2">Conflict of Interest</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="conflict" className="h-4 w-4" /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="conflict" className="h-4 w-4" /><span>No</span></label>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {tab === "support" && (
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div>
                <span className="font-medium mr-2">Appropriate Adult Required</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="aaReq" className="h-4 w-4" checked={aaRequired==='yes'} onChange={() => setAaRequired('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="aaReq" className="h-4 w-4" checked={aaRequired==='no'} onChange={() => setAaRequired('no')} /><span>No</span></label>
              </div>
              {aaRequired==='yes' && (
                <>
                  <div className="mt-1">
                    <span className="font-medium mr-2">Reason:</span>
                    <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="aaReasonType" className="h-4 w-4" checked={aaReasonType==='under17'} onChange={() => setAaReasonType('under17')} /><span>Under 17</span></label>
                    <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="aaReasonType" className="h-4 w-4" checked={aaReasonType==='vulnerable'} onChange={() => setAaReasonType('vulnerable')} /><span>Vulnerable</span></label>
                    <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="aaReasonType" className="h-4 w-4" checked={aaReasonType==='other'} onChange={() => setAaReasonType('other')} /><span>Other</span></label>
                  </div>
                  <div className="mt-1">
                    <input value={aaReason} onChange={e=>setAaReason(e.target.value)} placeholder="If yes, state reason" className="mt-1 w-full border rounded px-2 py-1" />
                  </div>
                </>
              )}
              <div className="mt-1">
                <span className="font-medium">AA Details:</span>
                <input value={aaDetails} onChange={e=>setAaDetails(e.target.value)} placeholder="Name / Relationship / Contact" className="mt-1 w-full border rounded px-2 py-1" />
              </div>
            </div>
            <div className="space-y-1">
              <div>
                <span className="font-medium mr-2">Interpreter Required</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="interpReq" className="h-4 w-4" checked={interpreterReq==='yes'} onChange={()=>setInterpreterReq('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="interpReq" className="h-4 w-4" checked={interpreterReq==='no'} onChange={()=>setInterpreterReq('no')} /><span>No</span></label>
              </div>
              {interpreterReq==='yes' && (
                <div className="mt-1">
                  <span className="font-medium">Language:</span>
                  <input value={interpreterLang} onChange={e=>setInterpreterLang(e.target.value)} placeholder="e.g. Polish" className="mt-1 w-full border rounded px-2 py-1" />
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}

      {tab === "eligibility" && (
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div>
                <span className="font-medium mr-2">Sufficient Benefit Test Met</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="sbt" className="h-4 w-4" checked={sufficientBenefit==='yes'} onChange={()=>setSufficientBenefit('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="sbt" className="h-4 w-4" checked={sufficientBenefit==='no'} onChange={()=>setSufficientBenefit('no')} /><span>No</span></label>
                {sufficientBenefit==='no' && (
                  <input value={benefitReason} onChange={e=>setBenefitReason(e.target.value)} placeholder="If no, why..." className="ml-3 w-full border rounded px-2 py-1 mt-1" />
                )}
              </div>
              <div>
                <span className="font-medium mr-2">CRM1 & CRM2 Eligibility:</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="crmElig" className="h-4 w-4" checked={crmEligible==='yes'} onChange={()=>setCrmEligible('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="crmElig" className="h-4 w-4" checked={crmEligible==='no'} onChange={()=>setCrmEligible('no')} /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium mr-2">CRM2 Signed</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="crm2" className="h-4 w-4" checked={crm2Signed==='yes'} onChange={()=>setCrm2Signed('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="crm2" className="h-4 w-4" checked={crm2Signed==='no'} onChange={()=>setCrm2Signed('no')} /><span>No</span></label>
                {crm2Signed==='no' && (
                  <input value={crm2Reason} onChange={e=>setCrm2Reason(e.target.value)} placeholder="If no, why not?" className="ml-3 w-full border rounded px-2 py-1 mt-1" />
                )}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {tab === "pre-interview" && (
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div><span className="font-medium">Time of Disclosure:</span> {disc ? dt(disc.providedAt) : '-'}</div>
              <div><span className="font-medium">Officer Providing Disclosure:</span> {disc?.source || '-'}</div>
              <div>
                <span className="font-medium">Disclosure Summary:</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={4} defaultValue={disc?.summary || ''} placeholder="Facts, context, evidence disclosed" />
              </div>
            </div>
            <div className="space-y-1">
              <div>
                <span className="font-medium mr-2">Significant Comments Made</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="sigc" className="h-4 w-4" checked={sigComments==='yes'} onChange={()=>setSigComments('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="sigc" className="h-4 w-4" checked={sigComments==='no'} onChange={()=>setSigComments('no')} /><span>No</span></label>
                {sigComments==='yes' && (
                  <textarea className="mt-1 w-full border rounded px-2 py-1" rows={2} value={sigCommentsText} onChange={e=>setSigCommentsText(e.target.value)} placeholder="Detail significant comments" />
                )}
              </div>
              <div>
                <span className="font-medium">Samples Taken:</span>
                <div className="mt-1 grid grid-cols-1 gap-1">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={sampleIntimate} onChange={e=>setSampleIntimate(e.target.checked)} /><span>Intimate</span></label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={sampleNonIntimate} onChange={e=>setSampleNonIntimate(e.target.checked)} /><span>Non-Intimate</span></label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={sampleOther} onChange={e=>setSampleOther(e.target.checked)} /><span>Other</span></label>
                  {sampleOther && (
                    <input className="border rounded px-2 py-1" placeholder="Other sample details" value={sampleOtherText} onChange={e=>setSampleOtherText(e.target.value)} />
                  )}
                </div>
              </div>
              <div>
                <span className="font-medium mr-2">Previous Convictions</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="pc" className="h-4 w-4" checked={prevConv==='yes'} onChange={()=>setPrevConv('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="pc" className="h-4 w-4" checked={prevConv==='no'} onChange={()=>setPrevConv('no')} /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium mr-2">Search of Premises</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="sp" className="h-4 w-4" checked={searchPrem==='yes'} onChange={()=>setSearchPrem('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="sp" className="h-4 w-4" checked={searchPrem==='no'} onChange={()=>setSearchPrem('no')} /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium">Co-Accused / Solicitors:</span>
                <input className="mt-1 w-full border rounded px-2 py-1" placeholder="Names and firms" value={coAccused} onChange={e=>setCoAccused(e.target.value)} />
              </div>
            </div>
          </div>
        </Panel>
      )}

      {tab === "legal-advice" && (
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div>
                <span className="font-medium mr-2">Previous Advice (within 6 months):</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="prevAdvice" className="h-4 w-4" checked={prevAdvice==='yes'} onChange={()=>setPrevAdvice('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="prevAdvice" className="h-4 w-4" checked={prevAdvice==='no'} onChange={()=>setPrevAdvice('no')} /><span>No</span></label>
                {prevAdvice==='yes' && (
                  <textarea className="mt-1 w-full border rounded px-2 py-1" rows={2} value={prevAdviceText} onChange={e=>setPrevAdviceText(e.target.value)} placeholder="If yes, details" />
                )}
              </div>
              <div>
                <span className="font-medium">Disclosure Review Summary:</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={4} value={disclosureReview} onChange={e=>setDisclosureReview(e.target.value)} />
              </div>
              <div>
                <span className="font-medium">Client Account / Statement:</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={4} value={clientAccount} onChange={e=>setClientAccount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <div>
                <span className="font-medium">Solicitor’s Advice and Reasoning:</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={5} value={solicitorAdvice} onChange={e=>setSolicitorAdvice(e.target.value)} />
              </div>
              <div>
                <span className="font-medium mr-2">Recommended Interview Approach:</span>
                {(['Prepared Statement','No Comment','Full Interview','Mixed'] as const).map(v => (
                  <label key={v} className="block mt-1"><input type="radio" name="approach" className="h-4 w-4 mr-2" checked={approach===v} onChange={()=>setApproach(v)} />{v}</label>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {tab === "police-interview" && (
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div><span className="font-medium">Interview Start Time:</span> {iv ? dt(iv.startAt) : (a0 ? dt(a0.arrivalAt) : '-')}</div>
              <div><span className="font-medium">Interview Finish Time:</span> {iv ? dt(iv.endAt) : (a0 ? dt(a0.departAt) : '-')}</div>
              <div><span className="font-medium">Interview Type:</span> -</div>
              <div>
                <span className="font-medium">Officer(s) Present:</span>
                <input className="ml-2 border rounded px-2 py-1 w-full mt-1" placeholder="Names / badge numbers" value={officers} onChange={e=>setOfficers(e.target.value)} />
              </div>
              <div>
                <span className="font-medium mr-2">Appropriate Adult Present:</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="aaPresent" className="h-4 w-4" checked={aaPresent==='yes'} onChange={()=>setAaPresent('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="aaPresent" className="h-4 w-4" checked={aaPresent==='no'} onChange={()=>setAaPresent('no')} /><span>No</span></label>
              </div>
              <div><span className="font-medium">Solicitor Present:</span> {a0?.rep?.name || '-'}</div>
            </div>
            <div className="space-y-1">
              <div><span className="font-medium">Caution Explanation Satisfactory</span> {iv ? (iv.cautionExplained ? 'Yes' : 'No') : '-'}</div>
              <div>
                <span className="font-medium mr-2">Client Response Type</span>
                {(['Answered','No Comment','Prepared Statement','Mixed'] as const).map(v => (
                  <label key={v} className="block mt-1"><input type="radio" name="clientResp" className="h-4 w-4 mr-2" checked={clientResp===v} onChange={()=>setClientResp(v)} />{v}</label>
                ))}
              </div>
              <div>
                <span className="font-medium mr-2">Solicitor Interventions</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="solInt" className="h-4 w-4" checked={solicitorInterventions==='yes'} onChange={()=>setSolicitorInterventions('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="solInt" className="h-4 w-4" checked={solicitorInterventions==='no'} onChange={()=>setSolicitorInterventions('no')} /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium">Interview Summary and Key Questions:</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={4} value={interviewSummary} onChange={e=>setInterviewSummary(e.target.value)} />
              </div>
            </div>
          </div>
        </Panel>
      )}

      {tab === "outcome" && (
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div>
                <span className="font-medium mr-2">Police Outcome:</span>
                {(['NFA','CHARGE','BAIL','RUI','OTHER'] as const).map(v => (
                  <label key={v} className="inline-flex items-center gap-2 mr-3"><input type="radio" name="outcome" className="h-4 w-4" checked={outcomeSel===v} onChange={()=>setOutcomeSel(v)} /><span>{v}</span></label>
                ))}
              </div>
              <div>
                <span className="font-medium mr-2">Client Informed of Outcome</span>
                <label className="inline-flex items-center gap-2 ml-2"><input type="radio" name="clientInf" className="h-4 w-4" checked={clientInformed==='yes'} onChange={()=>setClientInformed('yes')} /><span>Yes</span></label>
                <label className="inline-flex items-center gap-2 ml-3"><input type="radio" name="clientInf" className="h-4 w-4" checked={clientInformed==='no'} onChange={()=>setClientInformed('no')} /><span>No</span></label>
              </div>
              <div>
                <span className="font-medium">Advice on Next Steps:</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={4} value={nextSteps} onChange={e=>setNextSteps(e.target.value)} />
              </div>
              <div>
                <span className="font-medium">Follow-up Actions Required:</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows={4} value={followUps} onChange={e=>setFollowUps(e.target.value)} />
              </div>
            </div>
          </div>
        </Panel>
      )}

      {tab === "logistics" && (
        <Panel>
          <div className="border rounded divide-y">
            <div className="p-3 text-sm flex items-center justify-between">
              <div className="font-medium text-gray-900">Documents</div>
              <form className="flex items-center gap-2" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const input = form.querySelector('input[type=file]') as HTMLInputElement;
                const file = input.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('file', file);
                await fetch(`/api/documents/${data.id}/upload`, { method: 'POST', body: fd });
                window.location.reload();
              }}>
                <input type="file" className="text-sm" />
                <button type="submit" className="px-3 py-1.5 text-sm border rounded-md">Upload</button>
              </form>
            </div>
            {data.Documents.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No documents yet.</div>
            )}
            {data.Documents.map((d) => (
              <div key={d.id} className="p-3 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{d.title}</div>
                  <div className="text-gray-600">{d.type} • {fmt.format(new Date(d.createdAt))}</div>
                </div>
                <a href="#" className="text-blue-700 underline" onClick={(e) => e.preventDefault()}>View</a>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "time-travel" && (
        <Panel>
          <div className="text-sm space-y-3">
            <div className="border rounded">
              <div className="grid grid-cols-12 gap-2 p-2 font-medium bg-gray-50">
                <div className="col-span-2">Category</div>
                <div className="col-span-3">From</div>
                <div className="col-span-3">To</div>
                <div className="col-span-4">Details</div>
              </div>
              {timeRows.length === 0 && (
                <div className="p-3 text-gray-500">No entries yet.</div>
              )}
              {timeRows.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 p-2 border-t">
                  <div className="col-span-2">
                    <select className="w-full border rounded px-2 py-1" value={row.category} onChange={e=>{
                      const v = e.target.value as TRow['category'];
                      setTimeRows(R=>R.map((r,idx)=> idx===i?{...r, category:v}:r));
                    }}>
                      <option>Travel</option>
                      <option>Waiting</option>
                      <option>Attendance</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="datetime-local" className="w-full border rounded px-2 py-1" value={row.fromTime} onChange={e=>setTimeRows(R=>R.map((r,idx)=> idx===i?{...r, fromTime:e.target.value}:r))} />
                  </div>
                  <div className="col-span-3">
                    <input type="datetime-local" className="w-full border rounded px-2 py-1" value={row.toTime} onChange={e=>setTimeRows(R=>R.map((r,idx)=> idx===i?{...r, toTime:e.target.value}:r))} />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <input className="w-full border rounded px-2 py-1" placeholder="Details" value={row.details} onChange={e=>setTimeRows(R=>R.map((r,idx)=> idx===i?{...r, details:e.target.value}:r))} />
                    <button className="text-red-600" onClick={()=>setTimeRows(R=>R.filter((_,idx)=>idx!==i))}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <button className="border rounded px-2 py-1" onClick={()=>setTimeRows(R=>[...R, { category:'Attendance', fromTime:'', toTime:'', details:'' }])}>Add row</button>
            </div>
            <div className="text-gray-700 flex items-center gap-2">
              <span className="font-medium">Mileage (km):</span>
              <input className="border rounded px-2 py-1 w-32" value={mileage} onChange={e=>setMileage(e.target.value)} placeholder="0" />
            </div>
          </div>
        </Panel>
      )}

      {tab === "notes-signoff" && (
        <Panel>
          <div className="text-sm space-y-3">
            <div>
              <span className="font-medium">Summary Notes:</span>
              <textarea className="mt-1 w-full border rounded px-2 py-1" rows={6} value={summaryNotes} onChange={e=>setSummaryNotes(e.target.value)} placeholder="Case summary, outcomes, and key actions" />
            </div>
            <div>
              <span className="font-medium">Signature of Attending Solicitor:</span>
              <input className="ml-2 border rounded px-2 py-1" value={solicitorSig} onChange={e=>setSolicitorSig(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <span className="font-medium">Date and Time of Completion:</span>
              <input type="datetime-local" className="ml-2 border rounded px-2 py-1" value={completionAt} onChange={e=>setCompletionAt(e.target.value)} />
            </div>
            <div>
              <span className="font-medium">Version Control:</span>
              <input className="ml-2 border rounded px-2 py-1 w-32" value={versionInfo} onChange={e=>setVersionInfo(e.target.value)} placeholder="v1" />
            </div>
          </div>
        </Panel>
      )}
      </section>
    </div>
  );
}
