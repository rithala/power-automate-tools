import { Modal } from '@fluentui/react/lib/Modal';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';

export const LoaderModal: React.FC = () => (
  <Modal
    isDarkOverlay
    isOpen
    isBlocking
    styles={{
      scrollableContent: {
        overflow: 'hidden',
        height: 172,
      },
    }}
  >
    <Stack verticalFill verticalAlign="center">
      <Spinner size={SpinnerSize.large} label="Loading..." />
    </Stack>
  </Modal>
);
