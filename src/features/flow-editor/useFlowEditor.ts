import { MessageBarType } from "@fluentui/react/lib/MessageBar";
import { useEffect, useMemo, useState } from "react";
import { useMessageBar } from "../../common/components/Messages";
import {
  IApiProvider,
  useApiProviderContext,
} from "../../common/providers/ApiProvider";
import { FlowError } from "./types";

export const useFlowEditor = () => {
  const editorSchema = "https://power-automate-tools.local/flow-editor.json#";
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationPaneIsOpen, setValidationPaneIsOpen] =
    useState<boolean>(false);

  const [validationResult, setValidationResult] = useState<{
    errors: FlowError[];
    warnings: FlowError[];
  }>({ errors: [], warnings: [] });

  const api = useApiProviderContext();
  const query = new URLSearchParams(location.search);

  const envId = query.get("envId");
  const flowId = query.get("flowId");

  const messageBar = useMessageBar();

  const addMessage = useMemo(
    () => (msg: string | string[], type?: MessageBarType) => {
      messageBar.setMessages([
        {
          key: "1",
          messageBarType: type || MessageBarType.success,
          isMultiline: typeof msg !== "string",
          children: msg,
        },
      ]);
    },
    [messageBar]
  );

  return {
    isLoading,
    validationPaneIsOpen,
    setValidationPaneIsOpen,
    validationResult,
    ...messageBar,
    ...(() => {
      const [data, setData] = useState<{
        name: string;
        definition: string;
        environment: any;
      }>({
        name: "",
        definition: "",
        environment: null,
      });

      useEffect(() => {
        (async () => {
          if (envId && flowId) {
            try {
              setIsLoading(true);
              const flow = await api.get(`${getFlowUrl(envId, flowId)}`);
              setData({
                name: flow.properties.displayName,
                environment: flow.properties.environment,
                definition: JSON.stringify(
                  {
                    // parameters: flow.properties.parameters,
                    $schema: editorSchema,
                    connectionReferences: flow.properties.connectionReferences,
                    definition: flow.properties.definition,
                  },
                  null,
                  2
                ),
              });
            } catch (error) {
              addMessage(
                "Error during fetching the flow definition: " + error,
                MessageBarType.error
              );
            } finally {
              setIsLoading(false);
            }
          }
        })();
      }, [envId, flowId]);

      return data;
    })(),
    saveDefinition: async (
      name: string,
      environment: any,
      definition: string
    ) => {
      let retVal: string | null = null;
      const data = JSON.parse(definition);

      if (!data.definition) {
        addMessage('Missing "definition" flow property', MessageBarType.error);
        return;
      }

      if (!data.connectionReferences) {
        addMessage(
          'Missing "connectionReferences" flow property',
          MessageBarType.error
        );
        return;
      }

      // if (!data.parameters) {
      //   addMessage('Missing "parameters" flow property', MessageBarType.error);
      //   return;
      // }

      try {
        setIsLoading(true);

        const response = await api.patch(`${getFlowUrl(envId, flowId)}`, {
          properties: {
            displayName: name,
            environment: environment,
            definition: data.definition,
            connectionReferences: data.connectionReferences,
            // parameters: data.parameters,
          },
        });
        retVal = JSON.stringify(
          {
            $schema: editorSchema,
            connectionReferences: response.properties.connectionReferences,
            definition: response.properties.definition,
          },
          null,
          2
        );
        addMessage("The flow definition was saved successfully.");
      } catch (error) {
        addMessage(
          "Error during saving the flow definition: " + error,
          MessageBarType.error
        );
      } finally {
        setIsLoading(false);
      }

      return retVal;
    },
    validate: async (definition: string) => {
      try {
        setIsLoading(true);
        const errors: FlowError[] = await api.post(
          `${getFlowUrl(envId, flowId)}/checkFlowErrors`,
          {
            properties: {
              definition: JSON.parse(definition).definition,
            },
          }
        );

        const warnings: FlowError[] = await api.post(
          `${getFlowUrl(envId, flowId)}/checkFlowWarnings`,
          {
            properties: {
              definition: JSON.parse(definition).definition,
            },
          }
        );
        setValidationResult({ warnings, errors });
        setValidationPaneIsOpen(true);
      } catch (error) {
        addMessage(
          "Error during validation of the flow definition: " + error,
          MessageBarType.error
        );
      } finally {
        setIsLoading(false);
      }
    },
  };
};

function getFlowUrl(envId: string | null, flowId: string | null) {
  return `providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}`;
}
