import { useTranslation } from "react-i18next";
import { getAgentProfileDisplayName } from "#/utils/agent-profile-display-name";
import { I18nKey } from "#/i18n/declaration";
import { useAgentProfiles } from "#/hooks/query/use-agent-profiles";
import { SettingsDropdownInput } from "#/components/features/settings/settings-dropdown-input";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
}

/** One selector for automation setup and editing, backed by the profile library. */
export function AutomationAgentProfileSelector({ value, onChange }: Props) {
  const { t } = useTranslation("openhands");
  const { data, isLoading, isError } = useAgentProfiles();
  const profiles = data?.profiles ?? [];
  const selected = value
    ? profiles.find((profile) => profile.id === value)
    : undefined;
  const defaultLabel = t(I18nKey.SETTINGS$PROFILE_DEFAULT);
  const label =
    (selected ? getAgentProfileDisplayName(selected) : undefined) ??
    (value
      ? t(I18nKey.AUTOMATIONS$UNAVAILABLE_AGENT_PROFILE, { id: value })
      : defaultLabel);
  const items = [
    { key: "__default__", label: defaultLabel },
    ...profiles.flatMap((profile) =>
      profile.id
        ? [{ key: profile.id, label: getAgentProfileDisplayName(profile) }]
        : [],
    ),
    ...(value && !selected ? [{ key: value, label }] : []),
  ];
  return (
    <SettingsDropdownInput
      testId="automation-agent-profile"
      name="agent_profile_id"
      label={t(I18nKey.CHAT$SELECT_AGENT)}
      items={items}
      selectedKey={value ?? "__default__"}
      isClearable
      isLoading={isLoading}
      isDisabled={isError}
      onSelectionChange={(key) =>
        onChange(key && key !== "__default__" ? String(key) : null)
      }
    />
  );
}
