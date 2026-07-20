import { useMemo, useState } from 'react'

const STALE_DAYS = 60

export default function ManagePage({
  sections, inventory, onAddItem, onUpdateItem, onDeleteItem, onAddSection,
}) {
  const [editingId, setEditingId] = useState(null)
  const [showNewItem, setShowNewItem] = useState(false)
  const [showNewSection, setShowNewSection] = useState(false)
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState('all')
  const [staplesOnly, setStaplesOnly] = useState(false)

  const sectionById = useMemo(() => {
    const map = new Map()
    sections.forEach((s) => map.set(s.id, s))
    return map
  }, [sections])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inventory.filter((item) => {
      if (staplesOnly && !item.is_staple) return false
      if (activeSection !== 'all' && item.section_id !== activeSection) return false
      if (!q) return true
      return item.name.toLowerCase().includes(q)
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [inventory, query, activeSection, staplesOnly])

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>Manage Inventory</h1>
          <div style={styles.headerActions}>
            <button style={styles.secondaryBtn} onClick={() => setShowNewSection(true)}>+ Aisle</button>
            <button style={styles.primaryBtn} onClick={() => setShowNewItem(true)}>+ Item</button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.search}
        />

        <div style={styles.filterRow}>
          <div style={styles.chipRow}>
            <Chip label="All" active={activeSection === 'all'} onClick={() => setActiveSection('all')} />
            {sections.map((s) => (
              <Chip key={s.id} label={s.name} active={activeSection === s.id} onClick={() => setActiveSection(s.id)} />
            ))}
          </div>
          <button
            style={{
              ...styles.stapleToggle,
              background: staplesOnly ? 'var(--mustard)' : 'var(--chalk-dim)',
              color: staplesOnly ? '#fff' : 'var(--charcoal-soft)',
            }}
            onClick={() => setStaplesOnly(!staplesOnly)}
          >
            ★ Staples
          </button>
        </div>
      </div>

      <div style={styles.scroll}>
        {filtered.map((item) =>
          editingId === item.id ? (
            <EditItemForm
              key={item.id}
              item={item}
              sections={sections}
              onSave={async (updates) => {
                await onUpdateItem(item.id, updates)
                setEditingId(null)
              }}
              onCancel={() => setEditingId(null)}
              onDelete={async () => {
                await onDeleteItem(item.id)
                setEditingId(null)
              }}
            />
          ) : (
            <ItemRow
              key={item.id}
              item={item}
              sectionName={sectionById.get(item.section_id)?.name}
              onClick={() => setEditingId(item.id)}
            />
          )
        )}
        {filtered.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No items match</p>
            <p style={styles.emptyBody}>Try a different search or filter.</p>
          </div>
        )}
      </div>

      {showNewItem && (
        <Modal onClose={() => setShowNewItem(false)}>
          <NewItemForm
            sections={sections}
            onSave={async (item) => {
              await onAddItem(item)
              setShowNewItem(false)
            }}
            onCancel={() => setShowNewItem(false)}
          />
        </Modal>
      )}

      {showNewSection && (
        <Modal onClose={() => setShowNewSection(false)}>
          <NewSectionForm
            onSave={async (name) => {
              await onAddSection(name)
              setShowNewSection(false)
            }}
            onCancel={() => setShowNewSection(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.chip,
        background: active ? 'var(--charcoal)' : 'var(--chalk-dim)',
        color: active ? 'var(--chalk)' : 'var(--charcoal-soft)',
      }}
    >
      {label}
    </button>
  )
}

function ItemRow({ item, sectionName, onClick }) {
  const isStale = isPriceStale(item.price_updated_at)
  return (
    <button style={styles.row} onClick={onClick}>
      <div style={styles.rowMain}>
        <span style={styles.rowName}>
          {item.is_staple && <span style={styles.staplemark}>★ </span>}
          {item.name}
        </span>
        <span style={styles.rowMeta}>{sectionName || 'No aisle set'}</span>
      </div>
      <div style={styles.rowRight}>
        <span style={styles.rowPrice} className="mono">
          {item.est_price != null ? '$' + Number(item.est_price).toFixed(2) : '-'}
        </span>
        {isStale && <span style={styles.staleTag}>recheck price</span>}
      </div>
    </button>
  )
}

function NewItemForm({ sections, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [sectionId, setSectionId] = useState(sections[0]?.id || '')
  const [price, setPrice] = useState('')
  const [isStaple, setIsStaple] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      section_id: sectionId || null,
      est_price: price ? Number(price) : null,
      price_updated_at: price ? new Date().toISOString() : null,
      price_is_estimate: true,
      is_staple: isStaple,
    })
    setSaving(false)
  }

  return (
    <div style={styles.form}>
      <p style={styles.formTitle}>New item</p>
      <FormField label="Name">
        <input autoFocus style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sourdough Bread" />
      </FormField>
      <FormField label="Aisle">
        <select style={styles.input} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">No aisle</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </FormField>
      <FormField label="Estimated price">
        <input style={styles.input} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
      </FormField>
      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={isStaple} onChange={(e) => setIsStaple(e.target.checked)} />
        Weekly staple
      </label>
      <div style={styles.formActions}>
        <button style={styles.modalCancel} onClick={onCancel}>Cancel</button>
        <button style={styles.modalConfirm} onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : 'Add item'}
        </button>
      </div>
    </div>
  )
}

function EditItemForm({ item, sections, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(item.name)
  const [sectionId, setSectionId] = useState(item.section_id || '')
  const [price, setPrice] = useState(item.est_price != null ? String(item.est_price) : '')
  const [isStaple, setIsStaple] = useState(item.is_staple)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const priceChanged = price !== (item.est_price != null ? String(item.est_price) : '')

  async function handleSave() {
    setSaving(true)
    await onSave({
      name: name.trim(),
      section_id: sectionId || null,
      est_price: price ? Number(price) : null,
      price_updated_at: priceChanged ? new Date().toISOString() : item.price_updated_at,
      price_is_estimate: priceChanged ? true : item.price_is_estimate,
      is_staple: isStaple,
    })
    setSaving(false)
  }

  return (
    <div style={styles.form}>
      <p style={styles.formTitle}>Edit item</p>
      <FormField label="Name">
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Aisle">
        <select style={styles.input} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">No aisle</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </FormField>
      <FormField label="Estimated price">
        <input style={styles.input} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
      </FormField>
      {item.price_updated_at && (
        <p style={styles.priceMeta}>
          Last updated {new Date(item.price_updated_at).toLocaleDateString()}
          {item.price_is_estimate ? ' - estimate' : ' - receipt-verified'}
        </p>
      )}
      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={isStaple} onChange={(e) => setIsStaple(e.target.checked)} />
        Weekly staple
      </label>

      {confirmDelete ? (
        <div style={styles.deleteConfirm}>
          <p style={styles.deleteConfirmText}>Delete "{item.name}" from inventory?</p>
          <div style={styles.formActions}>
            <button style={styles.modalCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button style={styles.modalConfirm} onClick={onDelete}>Delete</button>
          </div>
        </div>
      ) : (
        <>
          <div style={styles.formActions}>
            <button style={styles.modalCancel} onClick={onCancel}>Cancel</button>
            <button style={styles.modalConfirm} onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <button style={styles.deleteLink} onClick={() => setConfirmDelete(true)}>Delete item</button>
        </>
      )}
    </div>
  )
}

function NewSectionForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim())
    setSaving(false)
  }

  return (
    <div style={styles.form}>
      <p style={styles.formTitle}>New aisle</p>
      <FormField label="Name">
        <input autoFocus style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. International Foods" />
      </FormField>
      <div style={styles.formActions}>
        <button style={styles.modalCancel} onClick={onCancel}>Cancel</button>
        <button style={styles.modalConfirm} onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : 'Add aisle'}
        </button>
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      {children}
    </label>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function isPriceStale(dateStr) {
  if (!dateStr) return false
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  return days > STALE_DAYS
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 },
  header: { padding: '20px 20px 12px', borderBottom: '1px solid var(--line)', background: 'var(--chalk)' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, margin: 0 },
  headerActions: { display: 'flex', gap: 8 },
  secondaryBtn: { border: '1px solid var(--line)', background: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' },
  primaryBtn: { border: 'none', background: 'var(--terracotta)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600 },
  search: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 15, background: '#fff', marginBottom: 10 },
  filterRow: { display: 'flex', alignItems: 'center', gap: 8 },
  chipRow: { display: 'flex', gap: 6, overflowX: 'auto', flex: 1, paddingBottom: 2 },
  chip: { border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 },
  stapleToggle: { border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 },
  scroll: { flex: 1, overflowY: 'auto', paddingBottom: 16 },
  row: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--line)', background: 'var(--chalk)', border: 'none', textAlign: 'left', cursor: 'pointer' },
  rowMain: { display: 'flex', flexDirection: 'column', gap: 2 },
  rowName: { fontSize: 16, color: 'var(--charcoal)' },
  staplemark: { color: 'var(--mustard)' },
  rowMeta: { fontSize: 12, color: 'var(--charcoal-soft)' },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  rowPrice: { fontSize: 15, color: 'var(--charcoal)' },
  staleTag: { fontSize: 10, background: 'var(--mustard)', color: '#fff', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' },
  empty: { padding: '40px 20px', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '0 0 6px' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 10 },
  modalCard: { background: 'var(--chalk)', borderRadius: '16px 16px 0 0', padding: '24px 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' },
  form: { display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 20px 8px' },
  formTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: 0 },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 15, background: '#fff', color: 'var(--charcoal)' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--charcoal)' },
  priceMeta: { fontSize: 12, color: 'var(--charcoal-soft)', margin: 0 },
  formActions: { display: 'flex', gap: 10, marginTop: 6 },
  modalCancel: { flex: 1, padding: '11px', borderRadius: 8, border: '1px solid var(--line)', background: 'none', color: 'var(--charcoal)', fontWeight: 600 },
  modalConfirm: { flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: 'var(--terracotta)', color: '#fff', fontWeight: 600 },
  deleteConfirm: { background: 'var(--chalk-dim)', borderRadius: 10, padding: 14 },
  deleteConfirmText: { fontSize: 14, margin: '0 0 12px' },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', marginTop: 4, textDecoration: 'underline' },
}
