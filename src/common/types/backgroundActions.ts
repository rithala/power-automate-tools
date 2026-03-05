export interface RefreshInitiator {
  type: 'refresh';
}

export interface AppLoaded {
  type: 'app-loaded';
}

export interface TokenChanged {
  type: 'token-changed';
  token: string;
  apiUrl: string;
  legacyApiUrl?: string;
  legacyToken?: string;
}

export type Actions = RefreshInitiator | TokenChanged | AppLoaded;
