import { useEffect, useState } from "react"
import { detectProvider, mapLabel } from "./maps"

export default function Popup() {
  const [tab, setTab] = useState<chrome.tabs.Tab>()
  const [status, setStatus] = useState<{ linked: boolean; count: number; maps: { tabId: number; name: string }[] }>()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const map = detectProvider(tab?.url || "")
  async function refresh() {
    try {
      const [current] = await chrome.tabs.query({ active: true, currentWindow: true })
      setTab(current)
      if (current?.id !== undefined) setStatus(await chrome.runtime.sendMessage({ type: "STATUS", tabId: current.id, list: true }))
    } catch (e) { setError(String(e)) }
  }
  useEffect(() => {
    void refresh()
    const changed = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "session" && changes.linkedTabs) {
        void refresh()
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
      await refresh()
    } catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }
  return <main style={{ width: 250, padding: 16, fontFamily: "system-ui", fontSize: 14 }}>
    <h1 style={{ fontSize: 20, margin: "0 0 16px" }}>MapLink</h1>
    {!tab ? <p>Loading…</p> : !map ? <p>This page is not supported.</p> : <>
      <p>This tab:<br /><strong>{mapLabel(tab.url || "")}</strong></p>
      <p>Status:<br /><span style={{ color: status?.linked ? "#16733c" : "#555" }}>{status ? status.linked ? "● Linked" : "○ Not linked" : "Loading…"}</span></p>
      <button disabled={busy || !status} onClick={toggle} style={{ padding: "7px 12px", cursor: "pointer" }}>{status?.linked ? "Disconnect this tab" : "Activate"}</button>
      <p style={{ color: "#666", marginBottom: 6 }}>Linked maps · {status?.count ?? 0}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 220, overflowY: "auto" }}>
        {status?.maps?.map(m => <li key={m.tabId} style={{ padding: "3px 0" }}>● {m.name}{m.tabId === tab.id ? " (this tab)" : ""}</li>)}
      </ul>
    </>}
    {error && <p style={{ color: "#b42318" }}>{error}</p>}
  </main>
}
