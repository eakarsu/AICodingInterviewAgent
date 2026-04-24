import React, { useState, useEffect } from 'react';
import { getInterviews, getCandidates, createInterview, deleteInterview } from '../services/api';
import Modal from '../components/Modal'; import DetailPanel from '../components/DetailPanel';
export default function InterviewsPage() {
  const [items, setItems] = useState([]); const [candidates, setCandidates] = useState([]); const [selected, setSelected] = useState(null); const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ candidate_id: '', difficulty: 'medium' });
  const load = () => { getInterviews().then(setItems).catch(()=>{}); getCandidates().then(setCandidates).catch(()=>{}); };
  useEffect(() => { load(); }, []);
  const statusColor = { scheduled: '#f39c12', in_progress: '#3498db', completed: '#2ecc71', cancelled: '#e74c3c' };
  const scoreColor = s => s >= 8 ? '#2ecc71' : s >= 6 ? '#f39c12' : '#e94560';
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ color: '#fff', margin: 0 }}>Interviews</h1>
      <button onClick={() => { setForm({ candidate_id: candidates[0]?.id || '', difficulty: 'medium' }); setShowModal(true); }} style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Schedule Interview</button></div>
    <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ borderBottom: '2px solid #0f3460' }}>
      {['Candidate','Level','Difficulty','Status','Score','Duration','Date'].map(h => <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#e94560', fontSize: 13 }}>{h}</th>)}</tr></thead>
      <tbody>{items.map(i => (<tr key={i.id} onClick={() => setSelected(i)} style={{ borderBottom: '1px solid #0f3460', cursor: 'pointer', background: selected?.id === i.id ? '#0f3460' : 'transparent' }}>
        <td style={{ padding: '12px 16px', color: '#fff' }}>{i.candidate_name}</td><td style={{ padding: '12px 16px', color: '#888' }}>{i.experience_level}</td>
        <td style={{ padding: '12px 16px' }}><span style={{ color: {easy:'#2ecc71',medium:'#f39c12',hard:'#e94560'}[i.difficulty] }}>{i.difficulty}</span></td>
        <td style={{ padding: '12px 16px' }}><span style={{ color: statusColor[i.status] }}>● {i.status}</span></td>
        <td style={{ padding: '12px 16px' }}><span style={{ color: i.score ? scoreColor(i.score) : '#888', fontWeight: 'bold', fontSize: 18 }}>{i.score || '-'}</span></td>
        <td style={{ padding: '12px 16px', color: '#ccc' }}>{i.duration_min ? `${i.duration_min}m` : '-'}</td>
        <td style={{ padding: '12px 16px', color: '#888', fontSize: 12 }}>{new Date(i.created_at).toLocaleDateString()}</td>
      </tr>))}</tbody></table></div>
    {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onEdit={() => {}} onDelete={() => { deleteInterview(selected.id); setSelected(null); load(); }}
      fields={[{key:'candidate_name',label:'Candidate'},{key:'experience_level',label:'Level'},{key:'difficulty',label:'Difficulty'},{key:'status',label:'Status'},{key:'score',label:'Score'},{key:'feedback',label:'Feedback'},{key:'duration_min',label:'Duration'},{key:'questions_asked',label:'Questions'}]} />}
    {showModal && <Modal title="Schedule Interview" onClose={() => setShowModal(false)} onSave={() => { createInterview(form).then(load); setShowModal(false); }}>
      <div style={{marginBottom:14}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>Candidate</label><select value={form.candidate_id} onChange={e=>setForm({...form,candidate_id:+e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff'}}>{candidates.map(c=><option key={c.id} value={c.id}>{c.name} ({c.experience_level})</option>)}</select></div>
      <div style={{marginBottom:14}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>Difficulty</label><select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff'}}>{['easy','medium','hard'].map(d=><option key={d}>{d}</option>)}</select></div>
    </Modal>}
  </div>);
}
