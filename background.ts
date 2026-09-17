import { detectProvider, mapLabel, validLocation, type LocationMessage } from "./maps"

// Serialize storage updates so simultaneous popup actions cannot lose a tab.
let queue = Promise.resolve()
async function linkedTabs(): Promise<number[]> {
  return (await chrome.storage.session.get("linkedTabs")).linkedTabs || []
}
async function handle(message: any, sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id ?? message.tabId
  if (typeof tabId !== "number") throw new Error("No current tab")
  const ids = await linkedTabs()
  if (message.type === "STATUS") {
    const maps = message.list ? (await chrome.tabs.query({})).filter(t => ids.includes(t.id!) && detectProvider(t.url || "")).map(t => ({ tabId: t.id!, name: mapLabel(t.url || "")! })) : undefined
    return { linked: ids.includes(tabId), count: maps?.length ?? ids.length, maps }
  }
  if (message.type === "SET_LINKED") {
    const tab = await chrome.tabs.get(tabId)
    if (!detectProvider(tab.url || "")) throw new Error("Unsupported page")
    const next = message.linked ? [...new Set([...ids, tabId])] : ids.filter(id => id !== tabId)
    await chrome.storage.session.set({ linkedTabs: next })
    await chrome.tabs.sendMessage(tabId, { type: "LINKED", linked: next.includes(tabId) }).catch(() => {})
    return { linked: next.includes(tabId), count: next.length }
  }
  if (validLocation(message as LocationMessage) && sender.tab?.id !== undefined && ids.includes(tabId)) {
    const source = await chrome.tabs.get(tabId)
    if (!detectProvider(source.url || "")) return
    let recipients = 0
    await Promise.all(ids.filter(id => id !== tabId).map(async id => {
      const tab = await chrome.tabs.get(id).catch(() => undefined)
      if (detectProvider(tab?.url || "")) {
        recipients++ // Attempted delivery, not a map-rendering acknowledgement.
        await chrome.tabs.sendMessage(id, message).catch(() => {})
      }
    }))
    return { ok: true, recipients }
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const task = queue.then(() => handle(message, sender))
  queue = task.then(() => {}, () => {})
  task.then(result => respond(result ?? { ok: true }), error => respond({ error: String(error.message || error) }))
  return true
})
chrome.tabs.onRemoved.addListener(tabId => {
  queue = queue.then(async () => {
    await chrome.storage.session.set({ linkedTabs: (await linkedTabs()).filter(id => id !== tabId) })
  }).catch(console.error)
})
