import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
const navBarStyles = mergeStyles({
  height: 48,
  lineHeight: 48,
  backgroundColor: '#F1F1F1',
});

const appTitleStyles = mergeStyles({
  fontWeight: 600,
  fontSize: 16,
  paddingLeft: 12,
});

export const NavBar: React.FC = () => {
  return (
    <Stack horizontal tokens={{ childrenGap: 10 }} className={navBarStyles}>
      <div className={appTitleStyles}>
        <Icon iconName="TriggerAuto" />
        <span> Power Automate Tools</span>
      </div>
    </Stack>
  );
};
