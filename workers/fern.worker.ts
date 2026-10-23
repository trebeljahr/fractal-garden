import {
  createFernSampling,
  type FernPointMessage,
  type FernPointRequest,
} from "../utils/fernSampling";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<FernPointRequest>) => void) | null;
  postMessage: (message: FernPointMessage, transfer: Transferable[]) => void;
};
const sampling = createFernSampling((message, transfer) => scope.postMessage(message, transfer));
scope.onmessage = ({ data }) => sampling.receive(data);
