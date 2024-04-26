import { Actions } from "./common/types/backgroundActions";
import jwtDecode from "jwt-decode";

interface State {
  token?: string;
  url?: URL;
  initiatorTabId?: number;
  appTabId?: number;
  apiUrl?: string;
  tokenExpires?: Date;
  lastMatchedRequest?: { envId: string; flowId: string } | null;
}

const state: State = {};

chrome.action.disable();

chrome.action.onClicked.addListener((tab) => {
  if (!state.lastMatchedRequest) {
    return;
  }

  chrome.tabs.create(
    {
      url: `${chrome.runtime.getURL("app.html")}?envId=${
        state.lastMatchedRequest.envId
      }&flowId=${state.lastMatchedRequest.flowId}`,
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
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  listenFlowApiRequests,
  {
    urls: ["https://*.api.flow.microsoft.com/*"],
  },
  ["requestHeaders"]
);

chrome.runtime.onMessage.addListener(
  (action: Actions, sender, sendResponse) => {
    if (sender.tab?.id === state.appTabId) {
      switch (action.type) {
        default:
          sendResponse();
          break;
        case "app-loaded":
          sendResponse();
          sendTokenChanged();
          break;
        case "refresh":
          sendResponse();
          refreshInitiator();
          break;
      }
    }
  }
);

function sendTokenChanged() {
  sendMessageToTab({
    type: "token-changed",
    token: state.token!,
    apiUrl: state.apiUrl!,
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
  if (state.appTabId !== details.tabId) {
    state.lastMatchedRequest = extractFlowDataFromUrl(details);

    const token = details.requestHeaders?.find(
      (x) => x.name.toLowerCase() === "authorization"
    )?.value;

    if (state.token !== token) {
      state.token = token;

      const decodedToken = jwtDecode(token!);

      state.tokenExpires = new Date((decodedToken as any).exp * 1000);

      const url = new URL(details.url);
      state.apiUrl = `${url.protocol}//${url.hostname}/`;

      sendTokenChanged();
    }

    if (state.lastMatchedRequest) {
      state.initiatorTabId = details.tabId;
      chrome.action.enable();
    } else {
      tryExtractFlowDataFromTabUrl(details.tabId);
    }
  }
}

function tryExtractFlowDataFromTabUrl(tabId: number) {
  chrome.tabs.get(tabId, (tab) => {
    state.lastMatchedRequest = extractFlowDataFromTabUrl(tab.url);

    if (state.lastMatchedRequest) {
      state.initiatorTabId = tabId;
      chrome.action.enable();
    }
  });
}

function sendMessageToTab(action: Actions) {
  if (state.appTabId) {
    chrome.tabs.sendMessage(state.appTabId!, action);
  }
}

function extractFlowDataFromTabUrl(url?: string) {
  if (!url) {
    return null;
  }

  const envPattern = /environments\/([a-zA-Z0-9\-]*)\//i;
  const envResult = envPattern.exec(url);

  if (!envResult) {
    return null;
  }

  const flowPattern =
    /flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}){1}/i;
  const flowResult = flowPattern.exec(url);

  if (!flowResult) {
    return null;
  }

  return {
    envId: envResult[1],
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
  const pattern =
    /\/providers\/Microsoft\.ProcessSimple\/environments\/(.*)\/flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}){1}/i;

  const result = pattern.exec(requestUrl);
  if (result) {
    return {
      envId: result[1],
      flowId: result[2],
    };
  }
  return null;
}
