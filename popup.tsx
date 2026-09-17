import { useEffect, useState } from "react"
import { detectProvider } from "./maps"

export default function Popup() {
  const [tab, setTab] = useState<chrome.tabs.Tab>()
  const [status, setStatus] = useState<{ linked: boolean; count: number }>()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const map = detectProvider(tab?.url || "")
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async ([current]) => {
      setTab(current)
      if (current?.id !== undefined) setStatus(await chrome.runtime.sendMessage({ type: "STATUS", tabId: current.id }))
    }).catch(e => setError(String(e)))
    const changed = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "session" && changes.linkedTabs) {
        chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
          const ids: number[] = changes.linkedTabs.newValue || []
          setStatus({ linked: ids.includes(t?.id ?? -1), count: ids.length })
        }).catch(e => setError(String(e)))
      }
    }
    chrome.storage.onChanged.addListener(changed)
    return () => chrome.storage.onChanged.removeListener(changed)
  }, [])
  async function toggle() {
    setBusy(true); setError("")
    try {
      const result = await chrome.runtime.sendMessage({ type: "SET_LINKED", tabId: tab?.id, linked: !status?.linked })
      if (result.error) throw new Error(result.error)
      setStatus(result)
    } catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }
  return <main style={{ width: 220, padding: 16, fontFamily: "system-ui", fontSize: 14 }}>
    <h1 style={{ fontSize: 20, margin: "0 0 16px" }}>MapLink</h1>
    {!tab ? <p>Loading…</p> : !map ? <p>This page is not supported.</p> : <>
      <p>Current map:<br /><strong>{map.name}</strong></p>
      <p>Status:<br /><span style={{ color: status?.linked ? "#16733c" : "#555" }}>{status ? status.linked ? "● Linked" : "○ Not linked" : "Loading…"}</span></p>
      <button disabled={busy || !status} onClick={toggle} style={{ padding: "7px 12px", cursor: "pointer" }}>{status?.linked ? "Disconnect" : "Activate"}</button>
      <p style={{ color: "#666", marginBottom: 0 }}>{status?.count ?? 0} linked tabs</p>
    </>}
    {error && <p style={{ color: "#b42318" }}>{error}</p>}
  </main>
}
