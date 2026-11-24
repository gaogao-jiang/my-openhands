import React from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { RemoveFileButton } from "./remove-file-button";

interface UploadedImageProps {
  image: File;
  onRemove: () => void;
  isLoading?: boolean;
}

export function UploadedImage({
  image,
  onRemove,
  isLoading = false,
}: UploadedImageProps) {
  const { t } = useTranslation("openhands");
  const [imageUrl, setImageUrl] = React.useState<string>("");

  React.useEffect(() => {
    // Create object URL for image preview
    const url = URL.createObjectURL(image);
    setImageUrl(url);

    // Cleanup function to revoke object URL
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);

  return (
    <div className="group relative flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-lg bg-interactive-hover">
      {isLoading ? (
        <LoaderCircle
          className="animate-spin w-5 h-5"
          color="var(--oh-contrast)"
        />
      ) : (
        imageUrl && (
          <img
            src={imageUrl}
            alt={image.name}
            className="h-full w-full rounded-lg object-cover"
          />
        )
      )}
      <RemoveFileButton
        onClick={onRemove}
        ariaLabel={t(I18nKey.BUTTON$REMOVE_IMAGE)}
        className="-right-1 -top-1"
      />
    </div>
  );
}
