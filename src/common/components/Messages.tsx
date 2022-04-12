import { IMessageBarProps, MessageBar } from '@fluentui/react/lib/MessageBar';
import { useMemo, useState } from 'react';

export interface MessagesProps {
  items: IMessageBarProps[];
  onDismissed: (msg: IMessageBarProps) => void;
}

export const useMessageBar = () => {
  const [messages, setMessages] = useState<IMessageBarProps[]>([]);

  const onDismissed = useMemo(
    () => (msg: IMessageBarProps) => {
      const ix = messages.indexOf(msg);
      if (ix !== -1) {
        messages.splice(ix, 1);
        setMessages([...messages]);
      }
    },
    [messages]
  );

  return {
    messages,
    setMessages,
    onDismissed,
  };
};

export const Messages: React.FC<MessagesProps> = ({ items, onDismissed }) => {
  return (
    <>
      {items.map((msg) => (
        <MessageBar {...msg} onDismiss={() => onDismissed(msg)} />
      ))}
    </>
  );
};
