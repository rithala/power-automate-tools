import { createContext, useContext, useEffect, useState } from 'react';
import { Actions } from '../types/backgroundActions';

export interface IApiProvider {
  get(url: string): Promise<any>;
  patch(url: string, data: any): Promise<any>;
  post(url: string, data: any): Promise<any>;
  legacyPost(url: string, data: any): Promise<any>;
  isApiReady: boolean;
  hasLegacyApi: boolean;
}

interface IApiDetails {
  apiUrl?: string;
  apiToken?: string;
  legacyApiUrl?: string;
  legacyToken?: string;
  isReady: boolean;
}

export const ApiProviderContext = createContext<IApiProvider>({} as any);
export const ApiProviderContextRoot = (): IApiProvider => {
  const [apiDetails, setApiDetails] = useState<IApiDetails>({ isReady: false });

  const makeRequest = async (
    baseUrl: string,
    token: string,
    apiVersion: string,
    url: string,
    method: string,
    data?: any
  ) => {
    const endpointUrl = baseUrl + url;
    const response = await fetch(
      endpointUrl +
        (endpointUrl.includes('?')
          ? `&api-version=${apiVersion}`
          : `?api-version=${apiVersion}`),
      {
        method: method,
        body: data ? JSON.stringify(data) : undefined,
        headers: {
          authorization: token,
          'Content-Type': 'application/json',
        } as any,
      }
    );

    const body = await response.json();

    if (response.ok) {
      return body;
    }
    throw new Error(body.error?.message);
  };

  const http = async (url: string, method: string, data?: any) => {
    return makeRequest(apiDetails.apiUrl!, apiDetails.apiToken!, '1', url, method, data);
  };

  const legacyHttp = async (url: string, method: string, data?: any) => {
    return makeRequest(apiDetails.legacyApiUrl!, apiDetails.legacyToken!, '2016-11-01', url, method, data);
  };

  useEffect(() => {
    const cb = (action: Actions, sender: any, sendResponse: () => void) => {
      switch (action.type) {
        default:
          break;
        case 'token-changed':
          setApiDetails((prev) => ({
            apiUrl: action.apiUrl || prev.apiUrl,
            apiToken: action.token || prev.apiToken,
            legacyApiUrl: action.legacyApiUrl || prev.legacyApiUrl,
            legacyToken: action.legacyToken || prev.legacyToken,
            isReady: Boolean(action.apiUrl && action.token),
          }));
          break;
      }
      sendResponse();
    };

    chrome.runtime.onMessage.addListener(cb);
    chrome.runtime.sendMessage({ type: 'app-loaded' } as Actions);

    return () => {
      chrome.runtime.onMessage.removeListener(cb);
    };
  }, []);

  return {
    get: (url: string) => http(url, 'GET'),
    patch: (url: string, data: any) => http(url, 'PATCH', data),
    post: (url: string, data: any) => http(url, 'POST', data),
    legacyPost: (url: string, data: any) => legacyHttp(url, 'POST', data),
    isApiReady: apiDetails.isReady,
    hasLegacyApi: Boolean(apiDetails.legacyApiUrl && apiDetails.legacyToken),
  };
};

export const useApiProviderContext = () => useContext(ApiProviderContext);
