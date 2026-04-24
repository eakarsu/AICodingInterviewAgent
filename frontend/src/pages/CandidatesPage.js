import React, { useState, useEffect } from 'react';
import { getCandidates, createCandidate, updateCandidate, deleteCandidate } from '../services/api';
import Modal from '../components/Modal'; import DetailPanel from '../components/DetailPanel';
export default function CandidatesPage() {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null); const [showModal, setShowModal] = useState(false); const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', experience_level: 'mid', skills: '' });
  const load = () => getCandidates().then(setItems).catch(()=>{});
  useEffect(() => { load(); }, []);
  const handleSave = async () => { if (editing) await updateCandidate(editing.id, form); else await createCandidate(form); setShowModal(false); setEditing(null); load(); };
  const levelColor = { junior: '#2ecc71', mid: '#3498db', senior: '#e94560' };
  const scoreColor = s => s >= 8 ? '#2ecc71' : s >= 6 ? '#f39c12' : s > 0 ? '#e94560' : '#888';
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ color: '#fff', margin: 0 }}>Candidates</h1>
      <button onClick={() => { setEditing(null); setForm({ name: '', email: '', experience_level: 'mid', skills: '' }); setShowModal(true); }} style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Add Candidate</button></div>
    <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ borderBottom: '2px solid #0f3460' }}>
      {['Name','Email','Level','Skills','Interviews','Avg Score'].map(h => <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#e94560', fontSize: 13 }}>{h}</th>)}</tr></thead>
      <tbody>{items.map(c => (<tr key={c.id} onClick={() => setSelected(c)} style={{ borderBottom: '1px solid #0f3460', cursor: 'pointer', background: selected?.id === c.id ? '#0f3460' : 'transparent' }}>
        <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 500 }}>{c.name}</td>
        <td style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>{c.email}</td>
        <td style={{ padding: '12px 16px' }}><span style={{ background: (levelColor[c.experience_level]||'#888')+'20', color: levelColor[c.experience_level], padding: '3px 10px', borderRadius: 12, fontSize: 12 }}>{c.experience_level}</span></td>
        <td style={{ padding: '12px 16px', color: '#ccc', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.skills}</td>
        <td style={{ padding: '12px 16px', color: '#3498db', fontWeight: 'bold' }}>{c.interviews_taken}</td>
        <td style={{ padding: '12px 16px' }}><span style={{ color: scoreColor(c.avg_score), fontWeight: 'bold', fontSize: 18 }}>{c.avg_score > 0 ? c.avg_score : '-'}</span></td>
      </tr>))}</tbody></table></div>
    {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setForm(selected); setShowModal(true); }} onDelete={() => { deleteCandidate(selected.id); setSelected(null); load(); }}
      fields={[{key:'name',label:'Name'},{key:'email',label:'Email'},{key:'experience_level',label:'Level'},{key:'skills',label:'Skills'},{key:'interviews_taken',label:'Interviews'},{key:'avg_score',label:'Avg Score'},{key:'status',label:'Status'}]} />}
    {showModal && <Modal title={editing ? 'Edit Candidate' : 'Add Candidate'} onClose={() => setShowModal(false)} onSave={handleSave}>
      {[{key:'name',label:'Name'},{key:'email',label:'Email'},{key:'skills',label:'Skills (comma-separated)'}].map(f => (<div key={f.key} style={{marginBottom:14}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>{f.label}</label><input value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',boxSizing:'border-box'}} /></div>))}
      <div style={{marginBottom:14}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>Level</label><select value={form.experience_level} onChange={e=>setForm({...form,experience_level:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff'}}>{['junior','mid','senior'].map(l=><option key={l} value={l}>{l}</option>)}</select></div>
    </Modal>}
  </div>);
}
