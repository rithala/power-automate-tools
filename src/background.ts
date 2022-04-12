import { Actions } from './common/types/backgroundActions';
import jwtDecode from 'jwt-decode';

interface State {
  token?: string;
  url?: URL;
  initiatorTabId?: number;
  appTabId?: number;
  environmentId?: string;
  flowId?: string;
  apiUrl?: string;
  tokenExpires?: Date;
}

const state: State = {};

chrome.action.disable();

chrome.action.onClicked.addListener((tab) => {
  state.environmentId = extractEnvId(tab);
  state.flowId = extractFlowId(tab);

  if (!state.environmentId || !state.flowId) {
    return;
  }

  state.initiatorTabId = tab.id;
  chrome.tabs.create(
    {
      url: `${chrome.runtime.getURL('app.html')}${
        state.environmentId ? `?envId=${state.environmentId}` : ''
      }${state.flowId ? `&flowId=${state.flowId}` : ''}`,
    },
    (appTab) => {
      state.appTabId = appTab.id;
    }
  );
});

chrome.tabs.onActivated.addListener((tabInfo) => {
  chrome.tabs.get(tabInfo.tabId, (tab) => {
    if (tab.url?.includes('flow.microsoft.com') && !state.appTabId) {
      chrome.action.enable();
    } else {
      chrome.action.disable();
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (state.appTabId === tabId) {
    delete state.appTabId;
    delete state.initiatorTabId;
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  listenFlowApiRequests,
  {
    urls: ['https://*.api.flow.microsoft.com/*'],
  },
  ['requestHeaders']
);

chrome.runtime.onMessage.addListener(
  (action: Actions, sender, sendResponse) => {
    if (sender.tab?.id === state.appTabId) {
      switch (action.type) {
        default:
          sendResponse();
          break;
        case 'app-loaded':
          sendResponse();
          sendTokenChanged();
          break;
        case 'refresh':
          sendResponse();
          refreshInitiator();
          break;
      }
    }
  }
);

function sendTokenChanged() {
  sendMessageToTab({
    type: 'token-changed',
    token: state.token!,
    apiUrl: state.apiUrl!,
  });
}

function extractEnvId(tab: chrome.tabs.Tab) {
  return extractTokenFromUrl(tab, 'environments');
}

function extractFlowId(tab: chrome.tabs.Tab) {
  return extractTokenFromUrl(tab, 'flows');
}

function extractTokenFromUrl(tab: chrome.tabs.Tab, tokenName: string) {
  const token = tokenName + '/';
  const tokenIndex = tab.url?.indexOf(token);

  return tokenIndex !== -1
    ? tab.url?.substring(tokenIndex! + token.length).split('/')[0]
    : undefined;
}

function refreshInitiator() {
  if (state.initiatorTabId) {
    chrome.tabs.reload(state.initiatorTabId);
  }
}

function listenFlowApiRequests(
  details: chrome.webRequest.WebRequestHeadersDetails
) {
  if (!state.initiatorTabId || state.initiatorTabId === details.tabId) {
    const token = details.requestHeaders?.find(
      (x) => x.name.toLowerCase() === 'authorization'
    )?.value;

    if (state.token !== token) {
      state.token = token;

      const decodedToken = jwtDecode(token!);

      state.tokenExpires = new Date((decodedToken as any).exp * 1000);

      const url = new URL(details.url);
      state.apiUrl = `${url.protocol}//${url.hostname}/`;

      sendTokenChanged();
    }
  }
}

function sendMessageToTab(action: Actions) {
  if (state.appTabId) {
    chrome.tabs.sendMessage(state.appTabId!, action);
  }
}
