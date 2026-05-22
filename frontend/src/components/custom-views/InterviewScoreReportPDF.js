import React, { useState } from 'react';
import jsPDF from 'jspdf';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3020/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function InterviewScoreReportPDF({ candidateId, interviewId }) {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState(null);

  const synthesize = async () => {
    if (!candidateId && !interviewId) {
      setErr('Pick a candidate (or pass an interview id).');
      return;
    }
    setBusy(true);
    setErr(null);
    setReport(null);
    try {
      const body = interviewId ? { interview_id: interviewId } : { candidate_id: candidateId };
      const r = await fetch(`${API}/custom-views/interview-score-report`, {
        method: 'POST', headers: h(), body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Synthesis failed');
      setReport(json);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const md = report.report_markdown || '';
    const lines = doc.splitTextToSize(md, 520);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    let y = 50;
    const pageH = doc.internal.pageSize.getHeight();
    lines.forEach(line => {
      if (y > pageH - 50) { doc.addPage(); y = 50; }
      doc.text(line, 50, y);
      y += 14;
    });
    doc.save(`interview-score-report-${report.candidate?.name || 'candidate'}.pdf`);
  };

  const breakdown = report?.breakdown;

  return (
    <div data-testid="interview-score-report-pdf" style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Interview Score Report (PDF)</h3>
      <p style={{ color: '#888', fontSize: 12 }}>
        AI synthesizes a structured score report (overall, by topic, by difficulty), then exports a PDF.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={synthesize} disabled={busy || (!candidateId && !interviewId)}
          style={{ padding: '10px 18px', background: busy ? '#888' : '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? 'Synthesizing…' : 'Synthesize Score Report'}
        </button>
        <button onClick={downloadPDF} disabled={!report}
          style={{ padding: '10px 18px', background: report ? '#0f3460' : '#444', color: '#fff', border: '1px solid #e94560', borderRadius: 6, cursor: report ? 'pointer' : 'not-allowed' }}>
          Download PDF
        </button>
      </div>
      {err && <div style={{ color: '#e94560', marginTop: 10 }}>{err}</div>}
      {report && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>
            {report.ai_synthesized ? 'AI-synthesized' : 'Fallback (local synthesis)'} · {report.submission_count} submissions reviewed
          </div>
          {breakdown && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ background: '#0f3460', padding: 12, borderRadius: 8, minWidth: 160 }}>
                <div style={{ color: '#888', fontSize: 11 }}>OVERALL AVG</div>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>
                  {breakdown.avg_score == null ? '—' : breakdown.avg_score.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#0f3460', padding: 12, borderRadius: 8, minWidth: 160 }}>
                <div style={{ color: '#888', fontSize: 11 }}>TOPICS</div>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{breakdown.by_topic.length}</div>
              </div>
              <div style={{ background: '#0f3460', padding: 12, borderRadius: 8, minWidth: 160 }}>
                <div style={{ color: '#888', fontSize: 11 }}>DIFFICULTIES</div>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{breakdown.by_difficulty.length}</div>
              </div>
            </div>
          )}
          <pre style={{
            background: '#0f1729', color: '#e0e0e0', padding: 14, borderRadius: 8,
            whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace'
          }}>
            {report.report_markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
