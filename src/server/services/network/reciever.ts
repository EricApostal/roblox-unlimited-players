import { BaseComponent } from "@flamework/components";
import { Service } from "@flamework/core";
import { OnServerRequestRecieved } from "./bindings";
import Signal from "@rbxts/signal";
import { ServerRequest } from "shared/replication/server-classes";
import { Events } from "server/network";

let rigSignals = new Map<number, Signal<(request: ServerRequest) => void>>();

@Service()
export class RecieverService extends BaseComponent implements OnServerRequestRecieved {
    onServerRequestRecieved(request: ServerRequest): void {
        Events.onEvent.broadcast(request);

        let playerId = request.id;
        let signal = NetworkRecieverService.getSignal(playerId);

        signal.Fire(request);
    }
}

export namespace NetworkRecieverService {
    export function getSignal(playerId: number): Signal<(request: ServerRequest) => void> {
        let signal = rigSignals.get(playerId);

        if (!signal) {
            signal = new Signal<(request: ServerRequest) => void>();
            rigSignals.set(playerId, signal);
        }

        return signal;
    }
}