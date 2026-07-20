import { useMemo, useState } from 'react'

export default function ListPage({
  sections, listItems, lists, activeListId, onSwitchList,
  onToggle, onRemove, onClear, onUpdateQuantity,
}) {
  const [confirmClear, setConfirmClear] = useState(false)

  const sectionById = useMemo(() => {
    const map = new Map()
    sections.forEach((s) => map.set(s.id, s))
    return map
  }, [sections])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of listItems) {
      const key = item.section_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    const groups = Array.from(map.entries()).map(([sectionId, items]) => ({
      section: sectionById.get(sectionId) || { id: 'none', name: 'Other', sort_order: 9999 },
      items,
    }))
    groups.sort((a, b) => a.section.sort_order - b.section.sort_order)
    return groups
  }, [listItems, sectionById])

  const total = useMemo(
    () => listItems.reduce((sum, item) => sum + (item.est_price ? Number(item.est_price) * (item.quantity || 1) : 0), 0),
    [listItems]
  )
  const checkedCount = listItems.filter((i) => i.is_checked).length
  const hasMultipleLists = lists && lists.length > 1

  return (
    <div style={styles.page}>
      {/* List switcher — prominent segmented control */}
      {hasMultipleLists && (
        <div style={styles.switcher}>
          {lists.map((list) => {
            const isActive = list.id === activeListId
            return (
              <button
                key={list.id}
                onClick={() => onSwitchList(list.id)}
                style={{
                  ...styles.switcherBtn,
                  background: isActive ? 'var(--charcoal)' : 'transparent',
                  color: isActive ? 'var(--chalk)' : 'var(--charcoal-soft)',
                }}
              >
                {list.kind === 'shared' ? '🛒 ' : '👤 '}{list.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Header row */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>The Store</h1>
          {listItems.length > 0 && (
            <p style={styles.subtitle}>{checkedCount} of {listItems.length} checked</p>
          )}
        </div>
        <div style={styles.headerRight}>
          <div style={styles.totalWrap}>
            <span style={styles.totalLabel}>Est. total</span>
            <span style={styles.totalValue} className="mono">${total.toFixed(2)}</span>
          </div>
          {listItems.length > 0 && (
            <button style={styles.clearBtn} onClick={() => setConfirmClear(true)}>Clear</button>
          )}
        </div>
      </div>

      {listItems.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>This list is empty</p>
          <p style={styles.emptyBody}>Head to Inventory and tap items to add them here, grouped by aisle.</p>
        </div>
      ) : (
        <div style={styles.scroll}>
          {grouped.map(({ section, items }) => (
            <div key={section.id} style={styles.sectionGroup}>
              <div style={styles.sectionHeader}>{section.name}</div>
              {items.map((item) => (
                <ListRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdateQuantity={onUpdateQuantity} />
              ))}
            </div>
          ))}
        </div>
      )}

      {confirmClear && (
        <div style={styles.modalOverlay} onClick={() => setConfirmClear(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p style={styles.modalTitle}>Clear this list?</p>
            <p style={styles.modalBody}>Removes all {listItems.length} items. Can't be undone.</p>
            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setConfirmClear(false)}>Cancel</button>
              <button style={styles.modalConfirm} onClick={() => { onClear(); setConfirmClear(false) }}>Clear list</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ListRow({ item, onToggle, onRemove, onUpdateQuantity }) {
  const qty = item.quantity || 1
  const lineTotal = item.est_price ? Number(item.est_price) * qty : null

  return (
    <div style={{ ...styles.row, background: item.is_checked ? 'var(--chalk-dim)' : 'var(--chalk)' }}>
      <button
        style={{ ...styles.checkbox, background: item.is_checked ? 'var(--sage)' : 'transparent', borderColor: item.is_checked ? 'var(--sage)' : 'var(--line)' }}
        onClick={() => onToggle(item)}
      >
        {item.is_checked && <CheckIcon />}
      </button>

      <button
        style={{ ...styles.rowLabel, textDecoration: item.is_checked ? 'line-through' : 'none', color: item.is_checked ? 'var(--charcoal-soft)' : 'var(--charcoal)' }}
        onClick={() => onToggle(item)}
      >
        {item.name}
      </button>

      <div style={styles.rowRight}>
        <div style={styles.qtyRow}>
          <button style={styles.qtyBtn} onClick={() => onUpdateQuantity(item, qty - 1)}>−</button>
          <span style={styles.qtyNum} className="mono">{qty}</span>
          <button style={styles.qtyBtn} onClick={() => onUpdateQuantity(item, qty + 1)}>+</button>
        </div>
        {lineTotal != null && (
          <span style={styles.rowPrice} className="mono">
            ${lineTotal.toFixed(2)}
            {qty > 1 && <span style={styles.unitPrice}> (${Number(item.est_price).toFixed(2)} ea)</span>}
          </span>
        )}
      </div>

      <button style={styles.removeBtn} onClick={() => onRemove(item.id)}>×</button>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6L4.5 8.5L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 },
  switcher: {
    display: 'flex',
    background: 'var(--charcoal)',
    padding: '10px 16px',
    gap: 8,
  },
  switcherBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 10,
    padding: '10px 8px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 20px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--chalk)',
  },
  title: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, margin: 0, color: 'var(--charcoal)' },
  subtitle: { margin: '4px 0 0', fontSize: 13, color: 'var(--charcoal-soft)' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  totalWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  totalLabel: { fontSize: 11, color: 'var(--charcoal-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  totalValue: { fontSize: 20, fontWeight: 500, color: 'var(--terracotta-dark)' },
  clearBtn: { border: '1px solid var(--line)', background: 'none', color: 'var(--charcoal-soft)', borderRadius: 8, padding: '6px 10px', fontSize: 12 },
  scroll: { flex: 1, overflowY: 'auto', paddingBottom: 16 },
  sectionGroup: { marginBottom: 4 },
  sectionHeader: { position: 'sticky', top: 0, background: 'var(--charcoal)', color: 'var(--chalk)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '8px 20px', zIndex: 1 },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, border: '2px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  rowLabel: { flex: 1, textAlign: 'left', background: 'none', border: 'none', fontSize: 16, padding: 0 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--chalk-dim)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--charcoal)' },
  qtyNum: { fontSize: 14, fontWeight: 500, minWidth: 16, textAlign: 'center' },
  rowPrice: { fontSize: 13, color: 'var(--charcoal-soft)' },
  unitPrice: { fontSize: 11, opacity: 0.7 },
  removeBtn: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 20, lineHeight: 1, padding: '0 2px', flexShrink: 0 },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 8px', color: 'var(--charcoal)' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0, lineHeight: 1.5 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 10 },
  modal: { background: 'var(--chalk)', borderRadius: 14, padding: '24px 20px', maxWidth: 320, width: '100%' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: '0 0 6px' },
  modalBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: '0 0 20px', lineHeight: 1.5 },
  modalActions: { display: 'flex', gap: 10 },
  modalCancel: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--line)', background: 'none', color: 'var(--charcoal)', fontWeight: 600 },
  modalConfirm: { flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 600 },
}
