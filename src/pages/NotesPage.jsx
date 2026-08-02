import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import MemberPicker from '../components/MemberPicker'
import { useAuth } from '../lib/AuthContext'

export default function NotesPage({ notes, noteMembers, otherMembers, onCreateMyNote, onUpdateContent, onUpdateSharing, onMenuOpen }) {
  const { user } = useAuth()
  const myNote = notes.find(n => n.created_by === user.id)
  const sharedWithMe = notes.filter(n => n.created_by !== user.id)

  return (
    <div style={s.page}>
      <PageHeader title="Notes" onMenuOpen={onMenuOpen} />
      <div style={s.body}>
        <NoteEditor
          note={myNote}
          isMine
          otherMembers={otherMembers}
          sharedWith={myNote ? noteMembers.filter(m => m.note_id === myNote.id).map(m => m.user_id) : []}
          onCreate={onCreateMyNote}
          onUpdateContent={onUpdateContent}
          onUpdateSharing={onUpdateSharing}
        />

        {sharedWithMe.map(note => {
          const owner = otherMembers.find(m => m.user_id === note.created_by)
          return (
            <div key={note.id}>
              <p style={s.sharedLabel}>Shared by {owner?.display_name || 'a household member'}</p>
              <NoteEditor note={note} isMine={false} onUpdateContent={onUpdateContent} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NoteEditor({ note, isMine, otherMembers = [], sharedWith = [], onCreate, onUpdateContent, onUpdateSharing }) {
  const [content, setContent] = useState(note?.content || '')
  const [status, setStatus] = useState(null) // null | 'saving' | 'saved'
  const [showShare, setShowShare] = useState(false)
  const [shareSelection, setShareSelection] = useState(sharedWith)
  const [sharingBusy, setSharingBusy] = useState(false)
  const timer = useRef(null)
  const skipNext = useRef(true)
  const noteIdRef = useRef(note?.id)

  // Keep local content in sync if the underlying note row changes identity (e.g. mine gets created)
  useEffect(() => {
    if (note?.id !== noteIdRef.current) {
      noteIdRef.current = note?.id
      setContent(note?.content || '')
      skipNext.current = true
    }
  }, [note?.id])

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setStatus('saving')
      try {
        if (note?.id) {
          await onUpdateContent(note.id, content)
        } else if (isMine && onCreate) {
          const created = await onCreate(content)
          noteIdRef.current = created?.id
        }
        setStatus('saved')
        setTimeout(() => setStatus(cur => cur === 'saved' ? null : cur), 2000)
      } catch {
        setStatus(null)
      }
    }, 1000)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  async function handleSaveSharing() {
    setSharingBusy(true)
    try {
      await onUpdateSharing(note.id, shareSelection)
      setShowShare(false)
    } finally { setSharingBusy(false) }
  }

  return (
    <div style={s.noteBlock}>
      {isMine && (
        <div style={s.headerRow}>
          <p style={s.hint}>
            {sharedWith.length > 0 ? `Shared with ${sharedWith.length} member${sharedWith.length !== 1 ? 's' : ''}` : 'Private — only you can see this'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {status && <span style={s.status}>{status === 'saving' ? 'Saving…' : 'Saved'}</span>}
            {note?.id && (
              <button style={s.shareBtn} onClick={() => { setShareSelection(sharedWith); setShowShare(true) }}>Share</button>
            )}
          </div>
        </div>
      )}
      <textarea
        style={s.textarea}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={isMine ? "e.g. Jake won't eat cooked carrots or anything with cilantro…" : undefined}
        readOnly={!isMine && !note}
      />

      {showShare && (
        <div style={s.overlay} onClick={() => setShowShare(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>Share this note</p>
            <MemberPicker members={otherMembers} selected={shareSelection} onChange={setShareSelection} />
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setShowShare(false)}>Cancel</button>
              <button style={s.confirmBtn} onClick={handleSaveSharing} disabled={sharingBusy}>{sharingBusy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100%' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' },
  noteBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  hint: { margin: 0, fontSize: 12, color: 'var(--charcoal-soft)' },
  status: { fontSize: 12, color: 'var(--charcoal-soft)' },
  shareBtn: { border: '1px solid var(--cream-border)', background: '#fff', color: 'var(--charcoal)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  sharedLabel: { margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--charcoal-soft)' },
  textarea: {
    minHeight: 260, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--cream-border)',
    fontSize: 16, lineHeight: 1.7, background: '#fff', color: 'var(--charcoal)', resize: 'vertical',
    fontFamily: 'var(--font-body)', boxSizing: 'border-box',
  },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 30 },
  modal: { background: '#fff', borderRadius: 14, padding: '20px', maxWidth: 340, width: '100%' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: '0 0 14px', color: 'var(--charcoal)' },
  modalActions: { display: 'flex', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--cream-border)', background: '#fff', color: 'var(--charcoal)', fontWeight: 600 },
  confirmBtn: { flex: 1, padding: 11, borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600 },
}
