import { useMemo, useState } from 'react'

export default function ListPage({
  sections,
  listItems,
  lists,
  activeListId,
  onSwitchList,
  onToggle,
  onRemove,
  onClear,
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
    () => listItems.reduce((sum, item) => sum + (item.est_price ? Number(item.est_price) : 0), 0),
    [listItems]
  )
  const checkedCount = listItems.filter((i) => i.is_checked).length

  if (listItems.length === 0) {
    return (
      <div style={styles.page}>
        <Header
          total={0}
          checked={0}
          count={0}
          onClearClick={null}
          lists={lists}
          activeListId={activeListId}
          onSwitchList={onSwitchList}
        />
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>This list is empty</p>
          <p style={styles.emptyBody}>
            Head to the Inventory tab and tap items to add them here, grouped by aisle.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <Header
        total={total}
        checked={checkedCount}
        count={listItems.length}
        onClearClick={() => setConfirmClear(true)}
        lists={lists}
        activeListId={activeListId}
        onSwitchList={onSwitchList}
      />

      <div style={styles.scroll}>
        {grouped.map(({ section, items }) => (
          <div key={section.id} style={styles.sectionGroup}>
            <div style={styles.sectionHeader}>{section.name}</div>
            {items.map((item) => (
              <ListRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
            ))}
          </div>
        ))}
      </div>

      {confirmClear && (
        <div style={styles.modalOverlay} onClick={() => setConfirmClear(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p style={styles.modalTitle}>Clear this list?</p>
            <p style={styles.modalBody}>This removes all {listItems.length} items. This can't be undone.</p>
            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button
                style={styles.modalConfirm}
                onClick={() => {
                  onClear()
                  setConfirmClear(false)
                }}
              >
                Clear list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Header({ total, checked, count, onClearClick, lists, activeListId, onSwitchList }) {
  return (
    <div style={styles.header}>
      <div style={styles.headerTop}>
        <div>
          <h1 style={styles.title}>The Store</h1>
          {count > 0 && (
            <p style={styles.subtitle}>
              {checked} of {count} checked
            </p>
          )}
        </div>
        <div style={styles.headerRight}>
          <div style={styles.totalWrap}>
            <span style={styles.totalLabel}>Est. total</span>
            <span style={styles.totalValue} className="mono">
              ${total.toFixed(2)}
            </span>
          </div>
          {onClearClick && (
            <button style={styles.clearBtn} onClick={onClearClick}>
              Clear
            </button>
          )}
        </div>
      </div>

      {lists && lists.length > 1 && (
        <div style={styles.listTabs}>
          {lists.map((list) => {
            const isActive = list.id === activeListId
            return (
              <button
                key={list.id}
                onClick={() => onSwitchList(list.id)}
                style={{
                  ...styles.listTab,
                  background: isActive ? 'var(--charcoal)' : 'var(--chalk-dim)',
                  color: isActive ? 'var(--chalk)' : 'var(--charcoal-soft)',
                }}
              >
                {list.kind === 'shared' ? '🛒 ' : '👤 '}
                {list.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ListRow({ item, onToggle, onRemove }) {
  return (
    <div style={styles.row}>
      <button
        style={{
          ...styles.checkbox,
          background: item.is_checked ? 'var(--sage)' : 'transparent',
          borderColor: item.is_checked ? 'var(--sage)' : 'var(--line)',
        }}
        onClick={() => onToggle(item)}
        aria-label={item.is_checked ? `Mark ${item.name} as not bought` : `Mark ${item.name} as bought`}
      >
        {item.is_checked && <CheckIcon />}
      </button>

      <button
        style={{
          ...styles.rowLabel,
          textDecoration: item.is_checked ? 'line-through' : 'none',
          color: item.is_checked ? 'var(--charcoal-soft)' : 'var(--charcoal)',
        }}
        onClick={() => onToggle(item)}
      >
        {item.name}
      </button>

      {item.est_price != null && (
        <span style={styles.rowPrice} className="mono">
          ${Number(item.est_price).toFixed(2)}
        </span>
      )}

      <button style={styles.removeBtn} onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}>
        ×
      </button>
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
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    flex: 1,
    minHeight: 0,
  },
  header: {
    padding: '20px 20px 12px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--chalk)',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 24,
    margin: 0,
    color: 'var(--charcoal)',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: 'var(--charcoal-soft)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  totalWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: 'var(--charcoal-soft)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 500,
    color: 'var(--terracotta-dark)',
  },
  clearBtn: {
    border: '1px solid var(--line)',
    background: 'none',
    color: 'var(--charcoal-soft)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
  },
  listTabs: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
  },
  listTab: {
    border: 'none',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 16,
  },
  sectionGroup: {
    marginBottom: 4,
  },
  sectionHeader: {
    position: 'sticky',
    top: 0,
    background: 'var(--charcoal)',
    color: 'var(--chalk)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    padding: '8px 20px',
    zIndex: 1,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--chalk)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '2px solid var(--line)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  rowLabel: {
    flex: 1,
    textAlign: 'left',
    background: 'none',
    border: 'none',
    fontSize: 16,
    padding: 0,
  },
  rowPrice: {
    fontSize: 14,
    color: 'var(--charcoal-soft)',
    flexShrink: 0,
  },
  removeBtn: {
    border: 'none',
    background: 'none',
    color: 'var(--charcoal-soft)',
    fontSize: 20,
    lineHeight: 1,
    padding: '0 2px',
    flexShrink: 0,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 40px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 18,
    margin: '0 0 8px',
    color: 'var(--charcoal)',
  },
  emptyBody: {
    fontSize: 14,
    color: 'var(--charcoal-soft)',
    margin: 0,
    lineHeight: 1.5,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  modal: {
    background: 'var(--chalk)',
    borderRadius: 14,
    padding: '24px 20px',
    maxWidth: 320,
    width: '100%',
  },
  modalTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 17,
    margin: '0 0 6px',
  },
  modalBody: {
    fontSize: 14,
    color: 'var(--charcoal-soft)',
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    padding: '10px',
    borderRadius: 8,
    border: '1px solid var(--line)',
    background: 'none',
    color: 'var(--charcoal)',
    fontWeight: 600,
  },
  modalConfirm: {
    flex: 1,
    padding: '10px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--danger)',
    color: '#fff',
    fontWeight: 600,
  },
}
