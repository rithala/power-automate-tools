import {
  CommandBar,
  ICommandBarItemProps
} from '@fluentui/react/lib/CommandBar';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useMemo, useState } from 'react';
import { LoaderModal } from '../../common/components/LoaderModal';
import { Messages } from '../../common/components/Messages';
import { FlowValidationResult } from './FlowValidationResult';
import { useFlowEditor } from './useFlowEditor';

const editorContainerClassName = mergeStyles({
  flex: 1,
});

export const FlowEditorPage: React.FC = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>(
    null as any
  );
  const {
    name,
    definition,
    isLoading,
    saveDefinition,
    validate,
    messages,
    onDismissed,
    validationResult,
    validationPaneIsOpen,
    setValidationPaneIsOpen,
  } = useFlowEditor();
  const commandBarItems = useMemo(
    () =>
      [
        {
          key: 'name',
          text: name,
        },
        {
          key: 'save',
          text: 'Save',
          iconProps: {
            iconName: 'Edit',
          },
          onClick: async () => {
            const savedDefinition = await saveDefinition(editor.getValue());

            if (savedDefinition) {
              editor.setValue(savedDefinition);
            }
          },
        },
        {
          key: 'validate',
          text: 'Validate',
          iconProps: {
            iconName: 'Medical',
          },
          onClick: () => validate(editor.getValue()),
        },
      ] as ICommandBarItemProps[],
    [name, editor]
  );

  return (
    <>
      {isLoading && <LoaderModal />}
      <Messages items={messages} onDismissed={onDismissed} />
      <FlowValidationResult
        errors={validationResult.errors}
        warnings={validationResult.warnings}
        isOpen={validationPaneIsOpen}
        onClose={() => setValidationPaneIsOpen(false)}
      />
      <CommandBar items={commandBarItems} />
      {!!definition && (
        <div className={editorContainerClassName}>
          <Editor
            defaultValue={definition}
            language="json"
            onMount={(editor) => setEditor(editor)}
          />
        </div>
      )}
    </>
  );
};
