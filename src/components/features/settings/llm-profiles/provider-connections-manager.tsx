import { useState } from "react";
import { KeyRound, Plug, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandButton } from "#/components/features/settings/brand-button";
import { ProviderConnectionRow } from "./provider-connection-row";
import { ProviderConnectionModal } from "./provider-connection-modal";
import { DeleteProviderConnectionModal } from "./delete-provider-connection-modal";
import type { ProviderConnection } from "#/api/provider-connections-service/provider-connections-service.api";
import { cn } from "#/utils/utils";
import {
  settingsListContainerClassName,
  settingsListDividerClassName,
} from "#/utils/settings-list-classes";
import { extensionModuleEmptyStateClassName } from "#/utils/extension-module-card-classes";
import { I18nKey } from "#/i18n/declaration";

interface ProviderConnectionsManagerProps {
  connections: ProviderConnection[];
  /** Number of LLM profiles linked to each connection id. */
  linkedCountById: Record<string, number>;
  isLoading: boolean;
  loadError: Error | null;
  /**
   * Called when a connection's "..." bulk-add action is clicked. The parent
   * owns the single shared AddModelsModal and opens it preselected to this
   * connection, so there is one modal for both entry points.
   */
  onAddModels: (connection: ProviderConnection) => void;
}

/**
 * Manages shared provider connections: a shared API key + optional base URL
 * that LLM profiles reference by id. Rendered only for the local agent-server,
 * which is the only backend exposing the endpoints. Each connection row carries
 * its own "add models" action that bulk-creates profiles linked to it.
 */
export function ProviderConnectionsManager({
  connections,
  linkedCountById,
  isLoading,
  loadError,
  onAddModels,
}: ProviderConnectionsManagerProps) {
  const { t } = useTranslation("openhands");
  const [isCreating, setIsCreating] = useState(false);
  const [connectionToEdit, setConnectionToEdit] =
    useState<ProviderConnection | null>(null);
  const [connectionToDelete, setConnectionToDelete] =
    useState<ProviderConnection | null>(null);

  const renderBody = () => {
    if (isLoading) return null;

    if (loadError) {
      return (
        <div
          data-testid="provider-connections-load-error"
          className={extensionModuleEmptyStateClassName}
        >
          <p className="text-sm text-feedback-error">
            {t(I18nKey.SETTINGS$PROVIDER_CONNECTIONS_LOAD_ERROR)}
          </p>
        </div>
      );
    }

    if (connections.length === 0) {
      return (
        <div
          data-testid="provider-connections-empty"
          className="flex items-center gap-2 py-2 text-muted"
        >
          <KeyRound size={16} className="shrink-0" aria-hidden="true" />
          <p className="text-xs text-muted">
            {t(I18nKey.SETTINGS$PROVIDER_CONNECTIONS_EMPTY)}
          </p>
        </div>
      );
    }

    return (
      <div
        className={cn(
          settingsListContainerClassName,
          settingsListDividerClassName,
        )}
      >
        {connections.map((connection) => (
          <ProviderConnectionRow
            key={connection.id}
            connection={connection}
            linkedProfileCount={linkedCountById[connection.id] ?? 0}
            onAddModels={onAddModels}
            onEdit={setConnectionToEdit}
            onDelete={setConnectionToDelete}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-3 border-t border-border-subtle pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 text-sm font-medium text-contrast">
              <Plug size={16} aria-hidden="true" />
              {t(I18nKey.SETTINGS$PROVIDER_CONNECTIONS_TITLE)}
              <span className="text-xs font-normal text-muted">
                {connections.length}
              </span>
            </h2>
            <p className="text-xs text-muted">
              {t(I18nKey.SETTINGS$PROVIDER_CONNECTIONS_SUBLINE)}
            </p>
          </div>
          <BrandButton
            testId="add-provider-connection"
            type="button"
            variant="secondary"
            startContent={<Plus size={14} aria-hidden="true" />}
            className="ml-auto"
            onClick={() => setIsCreating(true)}
          >
            {t(I18nKey.SETTINGS$PROVIDER_CONNECTION_ADD)}
          </BrandButton>
        </div>

        {renderBody()}
      </div>

      {isCreating && (
        <ProviderConnectionModal
          isCreate
          onClose={() => setIsCreating(false)}
        />
      )}
      <ProviderConnectionModal
        isCreate={false}
        connection={connectionToEdit}
        onClose={() => setConnectionToEdit(null)}
      />
      <DeleteProviderConnectionModal
        connection={connectionToDelete}
        onClose={() => setConnectionToDelete(null)}
      />
    </>
  );
}
