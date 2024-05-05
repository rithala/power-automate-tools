import { SharedStateClient } from "./common/shared-state";
import { Actions } from "./common/types/backgroundActions";
import { jwtDecode } from "jwt-decode";

const flowTabStates: { [parentTabId: number]: SharedStateClient } = {};
const appTabs: { [appTabId: number]: number } = {};
const parentTabs: { [parentTabId: number]: number } = {};

chrome.action.onClicked.addListener((tab) => {
  const flowInfo = extractFlowInfoFromTabUrl(tab.url);

  if (flowInfo && flowTabStates[tab.id!] && !parentTabs[tab.id!]) {
    const state = flowTabStates[tab.id!];

    state.changeState({
      environmentId: flowInfo.envId,
      currentTabFlowId: flowInfo.flowId,
    });

    chrome.tabs.create(
      {
        url: `${chrome.runtime.getURL(
          "app.html"
        )}?${state.toUrlParameter()}`,
      },
      (appTab) => {
        appTabs[appTab.id!] = tab.id!;
        parentTabs[tab.id!] = appTab.id!;
      }
    );
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (appTabs[tabId]) {
    delete parentTabs[appTabs[tabId]];
    delete appTabs[tabId];
  }
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (
    change.url &&
    extractFlowInfoFromTabUrl(change.url) &&
    !flowTabStates[tabId]
  ) {
    flowTabStates[tabId] = new SharedStateClient();
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  listenFlowApiRequests,
  {
    urls: ["https://*.api.flow.microsoft.com/*"],
  },
  ["requestHeaders"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  listenDynamicsApiRequests,
  {
    urls: ["https://*.api.crm4.dynamics.com/*"],
  },
  ["requestHeaders"]
);

chrome.runtime.onMessage.addListener((action: Actions, sender) => {
  switch (action.type) {
    default:
      break;
    case "refresh":
      if (sender.tab?.id && appTabs[sender.tab.id]) {
        chrome.tabs.reload(appTabs[sender.tab.id]);
      }
      break;
  }
});

function listenFlowApiRequests(
  details: chrome.webRequest.WebRequestHeadersDetails
) {
  if (!flowTabStates[details.tabId]) {
    flowTabStates[details.tabId] = new SharedStateClient();
  }

  const stateClient = flowTabStates[details.tabId];
  const state = stateClient.getState();
  const extractedToken = extractToken(details);

  if (
    extractedToken &&
    (state.flowApiUrl !== extractedToken?.apiUrl ||
      state.flowApiToken !== extractedToken.token)
  ) {
    stateClient.changeState({
      flowApiUrl: extractedToken?.apiUrl,
      flowApiToken: extractedToken?.token,
      flowApiTokenExpires: extractedToken?.expires,
    });
  }
}

function listenDynamicsApiRequests(
  details: chrome.webRequest.WebRequestHeadersDetails
) {
  if (!flowTabStates[details.tabId]) {
    flowTabStates[details.tabId] = new SharedStateClient();
  }

  const stateClient = flowTabStates[details.tabId];
  const state = stateClient.getState();
  const extractedToken = extractToken(details);

  if (
    extractedToken &&
    (state.dynamicsEnvUrl !== extractedToken?.apiUrl ||
      state.dynamicsApiToken !== extractedToken.token)
  ) {
    stateClient.changeState({
      dynamicsEnvUrl: extractedToken?.apiUrl,
      dynamicsApiToken: extractedToken?.token,
      dynamicsApiTokenExpires: extractedToken?.expires,
    });
  }
}

function extractToken(details: chrome.webRequest.WebRequestHeadersDetails) {
  const token = details.requestHeaders?.find(
    (x) => x.name.toLowerCase() === "authorization"
  )?.value;

  if (!token) {
    return null;
  }

  const decodedToken = jwtDecode(token);

  const expires = new Date((decodedToken as any).exp * 1000);

  const url = new URL(details.url);
  const apiUrl = `${url.protocol}//${url.hostname}/`;

  return {
    apiUrl,
    token,
    expires,
  };
}

function extractFlowInfoFromTabUrl(url?: string) {
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

  return {
    envId: envResult[1],
    flowId: flowResult ? flowResult[1] : null,
  };
}
