import React, { useState, useEffect } from 'react';
import { getQuestions, createQuestion, deleteQuestion } from '../services/api';
import Modal from '../components/Modal'; import DetailPanel from '../components/DetailPanel';
export default function QuestionsPage() {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null); const [showModal, setShowModal] = useState(false); const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ title: '', difficulty: 'medium', category: 'arrays', description: '', example_input: '', example_output: '', solution_hint: '', time_limit_min: 30 });
  const load = () => getQuestions(filter).then(setItems).catch(()=>{});
  useEffect(() => { load(); }, [filter]);
  const diffColor = { easy: '#2ecc71', medium: '#f39c12', hard: '#e94560' };
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ color: '#fff', margin: 0 }}>Questions Bank</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        {['', 'easy', 'medium', 'hard'].map(f => (<button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 14px', background: filter === f ? '#e94560' : '#16213e', color: filter === f ? '#fff' : '#ccc', border: '1px solid #0f3460', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{f || 'All'}</button>))}
        <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Add</button>
      </div></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
      {items.map(q => (<div key={q.id} onClick={() => setSelected(q)} style={{ background: '#16213e', padding: 20, borderRadius: 12, cursor: 'pointer', borderLeft: `4px solid ${diffColor[q.difficulty]||'#888'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 15 }}>{q.title}</h3>
          <span style={{ background: (diffColor[q.difficulty]||'#888')+'20', color: diffColor[q.difficulty], padding: '3px 10px', borderRadius: 12, fontSize: 11 }}>{q.difficulty}</span>
        </div>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.description}</p>
        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}><span style={{ color: '#3498db' }}>{q.category?.replace(/_/g,' ')}</span><span style={{ color: '#f39c12' }}>⏱️ {q.time_limit_min}min</span></div>
      </div>))}
    </div>
    {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onEdit={() => {}} onDelete={() => { deleteQuestion(selected.id); setSelected(null); load(); }}
      fields={[{key:'title',label:'Title'},{key:'difficulty',label:'Difficulty'},{key:'category',label:'Category'},{key:'description',label:'Description'},{key:'example_input',label:'Example Input'},{key:'example_output',label:'Example Output'},{key:'solution_hint',label:'Hint'},{key:'time_limit_min',label:'Time Limit'}]} />}
    {showModal && <Modal title="Add Question" onClose={() => setShowModal(false)} onSave={() => { createQuestion(form).then(load); setShowModal(false); }}>
      {[{key:'title',label:'Title'},{key:'description',label:'Description'},{key:'example_input',label:'Example Input'},{key:'example_output',label:'Expected Output'},{key:'solution_hint',label:'Hint'}].map(f => (<div key={f.key} style={{marginBottom:14}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>{f.label}</label><input value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',boxSizing:'border-box'}} /></div>))}
      <div style={{display:'flex',gap:12,marginBottom:14}}>
        <div style={{flex:1}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>Difficulty</label><select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff'}}>{['easy','medium','hard'].map(d=><option key={d}>{d}</option>)}</select></div>
        <div style={{flex:1}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff'}}>{['arrays','strings','linked_list','trees','graphs','dynamic_programming','design','system_design','stacks','binary_search'].map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}</select></div>
      </div>
    </Modal>}
  </div>);
}
