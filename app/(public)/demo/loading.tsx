import { DeliveryRoomSkeleton } from "../deliver/[shareToken]/_components/delivery-room-skeleton";

/** The demo room is the client room with its demo banner on top. */
export default function DemoRoomLoading() {
  return <DeliveryRoomSkeleton withDemoBanner />;
}
