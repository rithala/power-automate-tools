import { initializeIcons } from '@fluentui/react/lib/Icons';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { NavBar } from './common/components/NavBar';
import {
  ApiProviderContext,
  ApiProviderContextRoot
} from './common/providers/ApiProvider';
import { FlowEditorPage } from './features/flow-editor/FlowEditorPage';

initMonaco();

initializeIcons();

mergeStyles({
  ':global(body,html,#app)': {
    margin: 0,
    padding: 0,
    height: '100vh',
  },
});

createRoot(document.getElementById('app')!).render(<App />);

function App() {
  const apiProviderRoot = ApiProviderContextRoot();

  return (
    <HashRouter>
      <ApiProviderContext.Provider value={apiProviderRoot}>
        <Stack
          styles={{
            root: {
              height: '100%',
            },
          }}
        >
          <NavBar />
          {apiProviderRoot.isApiReady ? (
            <Routes>
              <Route path="/">
                <Route index element={<FlowEditorPage />} />
              </Route>
            </Routes>
          ) : (
            <h2>Please refresh the flow's details/edit tab first.</h2>
          )}
        </Stack>
      </ApiProviderContext.Provider>
    </HashRouter>
  );
}

function initMonaco() {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    enableSchemaRequest: true,
    schemas: [
      {
        uri: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json',
        schema: require('./schemas/workflowdefinition'),
      },
      {
        uri: 'https://power-automate-tools.local/flow-editor.json',
        schema: require('./schemas/flow-editor'),
        fileMatch: ['*']
      },
    ],
  });

  loader.config({
    monaco: monaco,
  });
}
