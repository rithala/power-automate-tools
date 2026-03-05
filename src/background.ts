import { Actions } from "./common/types/backgroundActions";

interface TabState {
  apiUrl?: string;
  apiToken?: string;
  legacyApiUrl?: string;
  legacyApiToken?: string;
  lastMatchedRequest?: { envId: string | null; flowId: string } | null;
}

interface State {
  initiatorTabId?: number;
  appTabId?: number;
  tabs: Record<number, TabState>;
}

const state: State = { tabs: {} };

function getTabState(tabId: number): TabState {
  if (!state.tabs[tabId]) {
    state.tabs[tabId] = {};
  }
  return state.tabs[tabId];
}

function getActiveTabState(): TabState | undefined {
  if (state.initiatorTabId !== undefined) {
    return state.tabs[state.initiatorTabId];
  }
  return undefined;
}

chrome.action.disable();

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) {
    return;
  }

  const tabState = state.tabs[tab.id];
  if (!tabState?.lastMatchedRequest || !tabState.lastMatchedRequest.envId) {
    return;
  }

  state.initiatorTabId = tab.id;

  chrome.tabs.create(
    {
      url: `${chrome.runtime.getURL("app.html")}?envId=${
        tabState.lastMatchedRequest.envId
      }&flowId=${tabState.lastMatchedRequest.flowId}`,
    },
    (appTab) => {
      state.appTabId = appTab.id;
    }
  );
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (state.appTabId === tabId) {
    delete state.appTabId;
  }
  delete state.tabs[tabId];
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  listenFlowApiRequests,
  {
    urls: [
      "https://*.api.flow.microsoft.com/*",
      "https://*.api.powerplatform.com/*",
    ],
  },
  ["requestHeaders"]
);

chrome.runtime.onMessage.addListener(
  (action: Actions, sender, sendResponse) => {
    sendResponse();
    if (sender.tab?.id === state.appTabId) {
      switch (action.type) {
        case "app-loaded":
          sendTokenChanged();
          break;
        case "refresh":
          refreshInitiator();
          break;
      }
    }
  }
);

function sendTokenChanged() {
  const tabState = getActiveTabState();
  if (!tabState?.apiToken || !tabState?.apiUrl) {
    return;
  }
  sendMessageToTab({
    type: "token-changed",
    token: tabState.apiToken,
    apiUrl: tabState.apiUrl,
    legacyApiUrl: tabState.legacyApiUrl,
    legacyToken: tabState.legacyApiToken,
  });
}

function refreshInitiator() {
  if (state.initiatorTabId) {
    chrome.tabs.reload(state.initiatorTabId);
  }
}

function listenFlowApiRequests(
  details: chrome.webRequest.WebRequestHeadersDetails
) {
  if (state.appTabId === details.tabId || details.tabId < 0) {
    return;
  }

  const tabState = getTabState(details.tabId);

  const matchedRequest = extractFlowDataFromUrl(details);
  if (matchedRequest) {
    tabState.lastMatchedRequest = matchedRequest;
  }

  const token = details.requestHeaders?.find(
    (x) => x.name.toLowerCase() === "authorization"
  )?.value;

  // Track both API base URLs per tab: the new powerplatform.com URL for flow
  // CRUD operations, and the legacy flow.microsoft.com URL for validation.
  const url = new URL(details.url);
  const baseUrl = `${url.protocol}//${url.hostname}/`;

  if (url.hostname.includes("api.powerplatform.com")) {
    tabState.apiUrl = baseUrl;
    if (token) {
      tabState.apiToken = token;
    }
  } else if (url.hostname.includes("api.flow.microsoft.com")) {
    tabState.legacyApiUrl = baseUrl;
    if (token) {
      tabState.legacyApiToken = token;
    }
    // Also set as primary apiUrl if we don't have a powerplatform.com one yet
    if (!tabState.apiUrl) {
      tabState.apiUrl = baseUrl;
      if (token) {
        tabState.apiToken = token;
      }
    }
  }

  // Notify the editor tab if this is the initiator tab
  if (details.tabId === state.initiatorTabId) {
    sendTokenChanged();
  }

  if (tabState.lastMatchedRequest && tabState.lastMatchedRequest.envId) {
    chrome.action.enable(details.tabId);
  } else if (tabState.lastMatchedRequest && !tabState.lastMatchedRequest.envId) {
    // We have a flow ID (from powerplatform.com URL) but need envId from the tab URL
    tryResolveEnvIdFromTab(details.tabId);
  } else {
    tryExtractFlowDataFromTabUrl(details.tabId);
  }
}

function tryExtractFlowDataFromTabUrl(tabId: number) {
  chrome.tabs.get(tabId, (tab) => {
    const tabData = extractFlowDataFromTabUrl(tab.url);

    if (tabData) {
      const tabState = getTabState(tabId);
      tabState.lastMatchedRequest = tabData;
      chrome.action.enable(tabId);
    }
  });
}

function tryResolveEnvIdFromTab(tabId: number) {
  chrome.tabs.get(tabId, (tab) => {
    const envId = extractEnvIdFromTabUrl(tab.url);
    const tabState = state.tabs[tabId];

    if (envId && tabState?.lastMatchedRequest) {
      tabState.lastMatchedRequest.envId = envId;
      chrome.action.enable(tabId);
    }
  });
}

function sendMessageToTab(action: Actions) {
  if (state.appTabId) {
    chrome.tabs.sendMessage(state.appTabId!, action);
  }
}

function extractEnvIdFromTabUrl(url?: string): string | null {
  if (!url) {
    return null;
  }

  const envPattern = /environments\/([a-zA-Z0-9\-]+)/i;
  const envResult = envPattern.exec(url);

  return envResult ? envResult[1] : null;
}

function extractFlowDataFromTabUrl(url?: string) {
  if (!url) {
    return null;
  }

  const envId = extractEnvIdFromTabUrl(url);
  if (!envId) {
    return null;
  }

  const flowPattern =
    /flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const flowResult = flowPattern.exec(url);

  if (!flowResult) {
    return null;
  }

  return {
    envId: envId,
    flowId: flowResult[1],
  };
}

function extractFlowDataFromUrl(
  details: chrome.webRequest.WebRequestHeadersDetails
) {
  const requestUrl = details.url;
  if (!requestUrl) {
    return null;
  }

  // Old format: .../providers/Microsoft.ProcessSimple/environments/{envId}/flows/{flowId}
  const oldPattern =
    /\/providers\/Microsoft\.ProcessSimple\/environments\/([^/]+)\/flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

  const oldResult = oldPattern.exec(requestUrl);
  if (oldResult) {
    return {
      envId: oldResult[1],
      flowId: oldResult[2],
    };
  }

  // New format: https://{encoded-env}.{environment|tenant}.api.powerplatform.com/powerautomate/flows/{flowId}
  const newPattern =
    /\.api\.powerplatform\.com\/powerautomate\/flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

  const newResult = newPattern.exec(requestUrl);
  if (newResult) {
    // The flow ID is in the path, but the environment ID is encoded in the
    // subdomain and not directly usable. Return the flow ID and resolve the
    // environment ID from the tab URL instead.
    return {
      envId: null,
      flowId: newResult[1],
    };
  }

  return null;
}
