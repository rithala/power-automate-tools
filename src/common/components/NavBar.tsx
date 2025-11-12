import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';

const prefersDark =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const navBarStyles = mergeStyles({
  height: 48,
  lineHeight: 48,
  backgroundColor: prefersDark ? '#1f1f1f' : '#F1F1F1',
  color: prefersDark ? '#ffffff' : '#000000',
  borderBottom: prefersDark ? '1px solid #333333' : '1px solid #e1e1e1',
});

const appTitleStyles = mergeStyles({
  fontWeight: 600,
  fontSize: 16,
  paddingLeft: 12,
  display: 'flex',
  alignItems: 'center',
});

export const NavBar: React.FC = () => {
  return (
    <Stack horizontal tokens={{ childrenGap: 10 }} className={navBarStyles}>
      <div className={appTitleStyles}>
        <Icon iconName="TriggerAuto" style={{ marginRight: 6 }} />
        <span>Power Automate Tools</span>
      </div>
    </Stack>
  );
};
