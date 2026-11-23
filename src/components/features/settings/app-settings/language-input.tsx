import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AvailableLanguages } from "#/i18n";
import { I18nKey } from "#/i18n/declaration";
import { SettingsDropdownInput } from "../settings-dropdown-input";

interface LanguageInputProps {
  name: string;
  onChange: (value: string) => void;
  defaultKey: string;
}

export function LanguageInput({
  defaultKey,
  onChange,
  name,
}: LanguageInputProps) {
  const { t } = useTranslation("openhands");

  const [selectedKey, setSelectedKey] = useState(defaultKey);

  useEffect(() => {
    setSelectedKey(defaultKey);
  }, [defaultKey]);

  const selectLanguage = (key: string) => {
    const language = AvailableLanguages.find((item) => item.value === key);
    if (!language) return;
    setSelectedKey(language.value);
    onChange(language.label);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <SettingsDropdownInput
        testId={name}
        name={name}
        onSelectionChange={(key) => {
          if (key !== null) selectLanguage(String(key));
        }}
        label={t(I18nKey.SETTINGS$LANGUAGE)}
        items={AvailableLanguages.map((l) => ({
          key: l.value,
          label: l.label,
        }))}
        selectedKey={selectedKey}
        isClearable={false}
        wrapperClassName="w-full min-w-0"
      />
    </div>
  );
}
