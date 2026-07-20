import { useMemo, useState } from 'react'

export default function InventoryPage({ sections, inventory, listItems, activeList, onAddToList }) {
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState('all')

  const listedIds = useMemo(
    () => new Set(listItems.map((i) => i.inventory_item_id).filter(Boolean)),
    [listItems]
  )

  const sectionById = useMemo(() => {
    const map = new Map()
    sections.forEach((s) => map.set(s.id, s))
    return map
  }, [sections])

  const staples = useMemo(() => inventory.filter((i) => i.is_staple), [inventory])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inventory.filter((item) => {
      if (activeSection !== 'all' && item.section_id !== activeSection) return false
      if (!q) return true
      const sectionName = sectionById.get(item.section_id)?.name?.toLowerCase() || ''
      return item.name.toLowerCase().includes(q) || sectionName.includes(q)
    })
  }, [inventory, query, activeSection, sectionById])

  const groupedFiltered = useMemo(() => {
    const map = new Map()
    for (const item of filtered) {
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
  }, [filtered, sectionById])

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Inventory</h1>
        {activeList && (
          <p style={styles.addingTo}>
            Adding to <strong>{activeList.kind === 'shared' ? '🛒 ' : '👤 '}{activeList.name}</strong>
          </p>
        )}
        <input
          type="text"
          placeholder="Search by item or aisle…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.search}
        />
        <div style={styles.chipRow}>
          <Chip label="All" active={activeSection === 'all'} onClick={() => setActiveSection('all')} />
          {sections.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              active={activeSection === s.id}
              onClick={() => setActiveSection(s.id)}
            />
          ))}
        </div>
      </div>

      <div style={styles.scroll}>
        {!query && activeSection === 'all' && staples.length > 0 && (
          <div style={styles.sectionGroup}>
            <div style={{ ...styles.sectionHeader, background: 'var(--terracotta)' }}>★ Staples</div>
            {staples.map((item) => (
              <InventoryRow
                key={item.id}
                item={item}
                onAdd={onAddToList}
                inList={listedIds.has(item.id)}
              />
            ))}
          </div>
        )}

        {groupedFiltered.map(({ section, items }) => (
          <div key={section.id} style={styles.sectionGroup}>
            <div style={styles.sectionHeader}>{section.name}</div>
            {items.map((item) => (
              <InventoryRow
                key={item.id}
                item={item}
                onAdd={onAddToList}
                inList={listedIds.has(item.id)}
              />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No matches</p>
            <p style={styles.emptyBody}>Try a different search, or add this item from the Manage tab.</p>
          </div>
        )}
      </div>
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

function InventoryRow({ item, onAdd, inList }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowMain}>
        <span style={styles.rowName}>
          {item.is_staple && <span style={styles.staplemark}>★ </span>}
          {item.name}
        </span>
        {item.est_price != null && (
          <span style={styles.rowPrice} className="mono">
            ${Number(item.est_price).toFixed(2)}
            {item.price_is_estimate && <span style={styles.estTag}> est.</span>}
          </span>
        )}
      </div>
      <button
        style={{
          ...styles.addBtn,
          background: inList ? 'var(--sage)' : 'var(--terracotta)',
        }}
        onClick={() => onAdd(item)}
      >
        {inList ? '✓ Added' : '+ Add'}
      </button>
    </div>
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
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 24,
    margin: '0 0 4px',
    color: 'var(--charcoal)',
  },
  addingTo: {
    fontSize: 13,
    color: 'var(--charcoal-soft)',
    margin: '0 0 12px',
  },
  search: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid var(--line)',
    fontSize: 15,
    background: '#fff',
    marginBottom: 10,
  },
  chipRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  chip: {
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
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 20px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--chalk)',
  },
  rowMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  rowName: {
    fontSize: 16,
    color: 'var(--charcoal)',
  },
  staplemark: {
    color: 'var(--mustard)',
  },
  rowPrice: {
    fontSize: 13,
    color: 'var(--charcoal-soft)',
  },
  estTag: {
    fontSize: 11,
    fontFamily: 'var(--font-body)',
    color: 'var(--charcoal-soft)',
    opacity: 0.7,
  },
  addBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 16,
    margin: '0 0 6px',
  },
  emptyBody: {
    fontSize: 14,
    color: 'var(--charcoal-soft)',
    margin: 0,
  },
}
