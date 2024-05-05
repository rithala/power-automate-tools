import { Actions } from "../types/backgroundActions";

export interface StateData {
  environmentId: string | null;
  currentTabFlowId: string | null;
  flowApiUrl: string | null;
  flowApiToken: string | null;
  flowApiTokenExpires: Date | null;
  dynamicsEnvUrl: string | null;
  dynamicsApiToken: string | null;
  dynamicsApiTokenExpires: Date | null;
}

export const SHARED_STATE_CHANGED = "PAT_SHARED_STATE_CHANGED";

export interface SharedStateChangedMsg {
  type: typeof SHARED_STATE_CHANGED;
  state: StateData;
  senderId: string;
}

export class SharedStateClient {
  private static readonly urlParamName = "state";

  private state: StateData = {
    environmentId: null,
    currentTabFlowId: null,
    flowApiUrl: null,
    flowApiToken: null,
    flowApiTokenExpires: null,
    dynamicsEnvUrl: null,
    dynamicsApiToken: null,
    dynamicsApiTokenExpires: null,
  };

  constructor(state?: StateData) {
    if (state) {
      this.state;
    }
  }

  private readonly clientId: string = uid();

  public getState() {
    return this.state;
  }

  public changeState(change: Partial<StateData>) {
    this.state = {
      ...this.state,
      ...change,
    };
    chrome.runtime.sendMessage<SharedStateChangedMsg>({
      type: SHARED_STATE_CHANGED,
      state: this.state,
      senderId: this.clientId,
    });
  }

  public requestParentReload() {
    chrome.runtime.sendMessage<Actions>({
      type: "refresh",
    });
  }

  public onChangeState(
    listener: (
      prev: StateData,
      current: StateData,
      changedKeys: (keyof StateData)[]
    ) => void
  ) {
    const listenerInternal = (msg: SharedStateChangedMsg) => {
      if (msg.type === SHARED_STATE_CHANGED && msg.senderId !== this.clientId) {
        const changedKeys = Object.keys(msg.state).filter(
          (key) =>
            this.state[key as keyof StateData] !==
            msg.state[key as keyof StateData]
        ) as (keyof StateData)[];

        listener(this.state, msg.state, changedKeys);
        this.state = msg.state;
      }
    };

    chrome.runtime.onMessage.addListener(listenerInternal);

    return () => chrome.runtime.onMessage.removeListener(listenerInternal);
  }

  public toUrlParameter() {
    return (
      SharedStateClient.urlParamName +
      "=" +
      encodeURIComponent(btoa(JSON.stringify(this.state)))
    );
  }
  public static fromUrl() {
    const params = new URLSearchParams(location.search);
    const param = params.get(SharedStateClient.urlParamName);

    if (!param) {
      alert("Missing state parameter");
      throw new Error("Missing state parameter");
    }

    return new SharedStateClient(JSON.parse(atob(param)));
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
