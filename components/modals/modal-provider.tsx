"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  Dispatch,
  SetStateAction,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TrashBinDialog } from "@/components/workspaces/trash-bin-dialog";
import { mutatePrefix } from "@/lib/swr";
import { NewDeliveryModal } from "./new-delivery-modal";

export interface ModalWorkspace {
  id: string;
  brandName: string;
  slug: string;
}

export interface ModalContextType {
  showTrashModal: boolean;
  setShowTrashModal: Dispatch<SetStateAction<boolean>>;
  showNewDeliveryModal: boolean;
  setShowNewDeliveryModal: Dispatch<SetStateAction<boolean>>;
  workspace: ModalWorkspace;
}

const DEFAULT_WORKSPACE: ModalWorkspace = {
  id: "",
  brandName: "",
  slug: "",
};

export const ModalContext = createContext<ModalContextType>({
  showTrashModal: false,
  setShowTrashModal: () => {},
  showNewDeliveryModal: false,
  setShowNewDeliveryModal: () => {},
  workspace: DEFAULT_WORKSPACE,
});

export function useModals() {
  const context = useContext(ModalContext);
  return context;
}

/**
 * Isolated query param synchronization component.
 * Must be wrapped in its own <Suspense fallback={null}> so useSearchParams()
 * does not cause the parent provider or children to de-opt or suspend.
 */
function ModalQuerySync({
  setShowTrashModal,
  setShowNewDeliveryModal,
}: {
  setShowTrashModal: Dispatch<SetStateAction<boolean>>;
  setShowNewDeliveryModal: Dispatch<SetStateAction<boolean>>;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.has("trash")) {
      setShowTrashModal(true);
    }
    if (searchParams.has("newDelivery")) {
      setShowNewDeliveryModal(true);
    }
  }, [searchParams, setShowTrashModal, setShowNewDeliveryModal]);

  return null;
}

export function ModalProvider({
  children,
  workspace = DEFAULT_WORKSPACE,
}: {
  children: ReactNode;
  workspace?: ModalWorkspace;
}) {
  const router = useRouter();

  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showNewDeliveryModal, setShowNewDeliveryModal] = useState(false);

  // Clean up URL query parameters when modal closes without triggering Suspense
  const removeQueryParam = useCallback(
    (param: string) => {
      if (typeof window === "undefined") return;
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          const search = url.searchParams.toString();
          const target = search ? `${url.pathname}?${search}` : url.pathname;
          router.replace(target, { scroll: false });
        }
      } catch {
        // Safe fallback in non-browser contexts
      }
    },
    [router]
  );

  const handleTrashOpenChange = useCallback(
    (open: boolean) => {
      setShowTrashModal(open);
      if (!open) {
        removeQueryParam("trash");
      }
    },
    [removeQueryParam]
  );

  const handleNewDeliveryOpenChange = useCallback(
    (open: boolean) => {
      setShowNewDeliveryModal(open);
      if (!open) {
        removeQueryParam("newDelivery");
      }
    },
    [removeQueryParam]
  );

  return (
    <ModalContext.Provider
      value={{
        showTrashModal,
        setShowTrashModal,
        showNewDeliveryModal,
        setShowNewDeliveryModal,
        workspace,
      }}
    >
      {/* Isolated URL query sync running inside its own Suspense boundary */}
      <Suspense fallback={null}>
        <ModalQuerySync
          setShowTrashModal={setShowTrashModal}
          setShowNewDeliveryModal={setShowNewDeliveryModal}
        />
      </Suspense>

      {children}

      {/* Global Workspace Trash Bin Dialog */}
      <TrashBinDialog
        isOpen={showTrashModal}
        onOpenChange={handleTrashOpenChange}
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        onItemRestored={async () => {
          await mutatePrefix(`/api/workspaces/${workspace.slug}`);
          await mutatePrefix("/api/deliveries");
          await mutatePrefix("/api/portfolio");
        }}
      />

      {/* Global New Delivery Modal */}
      <NewDeliveryModal
        isOpen={showNewDeliveryModal}
        onOpenChange={handleNewDeliveryOpenChange}
        workspace={workspace}
      />
    </ModalContext.Provider>
  );
}
