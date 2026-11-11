"use server";

import {
  deleteAssetAction as rawDeleteAsset,
  restoreAssetAction as rawRestoreAsset,
  permanentDeleteAssetAction as rawPermanentDeleteAsset,
  listTrashAssetsAction as rawListTrashAssets,
  emptyTrashAction as rawEmptyTrash,
  updateAssetAction as rawUpdateAsset,
  setActiveVersionAction as rawSetActiveVersion,
  type DeleteAssetOptions,
  type UpdateAssetInput,
  type UpdateAssetOptions,
} from "../assets";

export async function deleteAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  return rawDeleteAsset(assetId, options);
}

export async function restoreAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  return rawRestoreAsset(assetId, options);
}

export async function permanentDeleteAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  return rawPermanentDeleteAsset(assetId, options);
}

export async function listTrashAssetsAction(workspaceId: string) {
  return rawListTrashAssets(workspaceId);
}

export async function emptyTrashAction(workspaceId: string, workspaceSlug?: string) {
  return rawEmptyTrash(workspaceId, workspaceSlug);
}

export async function updateAssetAction(
  itemId: string,
  data: UpdateAssetInput,
  options?: UpdateAssetOptions
) {
  return rawUpdateAsset(itemId, data, options);
}

export async function setActiveVersionAction(
  assetId: string,
  versionId: string,
  options?: { deliveryId?: string; workspaceSlug?: string }
) {
  return rawSetActiveVersion(assetId, versionId, options);
}
