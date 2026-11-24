import { useState } from "react";
import { useAutomationSubPageNav } from "#/components/features/automations/dashboard/use-automation-sub-page-nav";
import { RecommendedAutomationsLauncher } from "#/components/features/automations/recommended-automations-launcher";
import { SearchInput } from "#/components/features/automations/search-input";
import {
  EMPTY_TEMPLATE_FILTERS,
  type TemplateFilters,
} from "#/components/features/automations/template-filter-chips";
import { ManifestSubpageLayout } from "#/components/features/manifest/manifest-subpage-layout";
import { getTemplatesPageSpec } from "#/manifests/automation-interface";
import { localizeManifestPageCopy } from "#/manifests/automation-localization";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

/**
 * The templates sub-page. It exists only while the admitted interface
 * manifest declares it — like a setup route for an id no entry claims, an
 * undeclared page is a 404 rendered by the layout's error boundary.
 */
export const clientLoader = () => {
  if (!getTemplatesPageSpec()) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }
  return null;
};

export default function AutomationTemplates() {
  const { t, i18n } = useTranslation("openhands");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<TemplateFilters>(
    EMPTY_TEMPLATE_FILTERS,
  );
  const spec = getTemplatesPageSpec();
  const nav = useAutomationSubPageNav();
  if (!spec || !nav) return null;
  const copy = localizeManifestPageCopy("templates", spec, i18n.language);

  return (
    <ManifestSubpageLayout
      heading={nav.heading}
      navTestIdBase="automations-navbar"
      items={nav.items}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-content">
          {t(I18nKey.AUTOMATIONS$MANIFEST_TEMPLATES_TITLE, {
            defaultValue: copy.title,
          })}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t(I18nKey.AUTOMATIONS$MANIFEST_TEMPLATES_DESCRIPTION, {
            defaultValue: copy.description,
          })}
        </p>
      </div>
      <div className="w-full">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>
      <RecommendedAutomationsLauncher
        query={searchQuery}
        onClearQuery={() => setSearchQuery("")}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </ManifestSubpageLayout>
  );
}
