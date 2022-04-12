import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Actions } from '../types/backgroundActions';

export interface IApiProvider {
  get(url: string): Promise<any>;
  patch(url: string, data: any): Promise<any>;
  post(url: string, data: any): Promise<any>;
  isApiReady: boolean;
}

interface IApiDetails {
  apiUrl?: string;
  token?: string;
  isReady: boolean;
}

export const ApiProviderContext = createContext<IApiProvider>({} as any);
export const ApiProviderContextRoot = (): IApiProvider => {
  const [apiDetails, setApiDetails] = useState<IApiDetails>({ isReady: false });

  const http = useMemo(
    () => async (url: string, method: string, data?: any) => {
      const endpointUrl = apiDetails.apiUrl + url;
      const response = await fetch(
        endpointUrl +
          (endpointUrl.includes('?')
            ? '&api-version=2016-11-01'
            : '?api-version=2016-11-01'),
        {
          method: method,
          body: data ? JSON.stringify(data) : undefined,
          headers: {
            authorization: apiDetails.token,
            'Content-Type': 'application/json',
          } as any,
        }
      );

      const body = await response.json();

      if (response.ok) {
        return body;
      }
      throw new Error(body.error?.message);
    },
    [apiDetails.apiUrl, apiDetails.token]
  );

  useEffect(() => {
    const cb = (action: Actions, sender: any, sendResponse: () => void) => {
      switch (action.type) {
        default:
          break;
        case 'token-changed':
          setApiDetails({
            apiUrl: action.apiUrl,
            token: action.token,
            isReady: Boolean(action.apiUrl && action.token),
          });
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
    isApiReady: apiDetails.isReady,
  };
};

export const useApiProviderContext = () => useContext(ApiProviderContext);
