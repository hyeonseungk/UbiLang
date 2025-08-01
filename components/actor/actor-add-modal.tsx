"use client";

import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface ActorAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  actorName: string;
  setActorName: (name: string) => void;
  onAdd: () => void;
  saving: boolean;
}

export default function ActorAddModal({
  isOpen,
  onClose,
  actorName,
  setActorName,
  onAdd,
  saving,
}: ActorAddModalProps) {
  const t = useT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {t("actor.add_modal_title")}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("actor.name_label")}
            </label>
            <input
              id="add-actor-name-input"
              type="text"
              value={actorName}
              onChange={(e) => setActorName(e.target.value)}
              placeholder={t("actor.name_placeholder")}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("buttons.cancel")}
          </Button>
          <Button onClick={onAdd} disabled={saving || !actorName.trim()}>
            {saving ? t("buttons.adding") : t("buttons.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
