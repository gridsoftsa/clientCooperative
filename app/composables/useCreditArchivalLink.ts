export function useCreditArchivalLink() {
  const archivalApi = useArchivalFileApi()
  const creditArchivalLinkEnabled = useState('credit-archival-link-enabled', () => false)
  const creditArchivalLinkLoaded = useState('credit-archival-link-loaded', () => false)

  async function refreshCreditArchivalLink(): Promise<void> {
    if (import.meta.server) {
      return
    }

    try {
      const data = await archivalApi.fetchCreditLinkSettings()
      creditArchivalLinkEnabled.value = data.enabled === true
    }
    catch {
      creditArchivalLinkEnabled.value = false
    }
    finally {
      creditArchivalLinkLoaded.value = true
    }
  }

  return {
    creditArchivalLinkEnabled,
    creditArchivalLinkLoaded,
    refreshCreditArchivalLink,
  }
}
