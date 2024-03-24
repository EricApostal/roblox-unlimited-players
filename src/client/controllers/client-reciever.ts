import { BaseComponent } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import Signal from "@rbxts/signal";
import { Events } from "client/network";
import { ServerRequest } from "shared/replication/server-classes";

let rigSignals = new Map<number, Signal<(request: ServerRequest) => void>>();

@Controller()
export class RecieverService extends BaseComponent implements OnStart {
    onStart(): void {
        Events.onEvent.connect((request) => {
            this.onServerRequestRecieved(request as unknown as ServerRequest);
        });
    }

    private onServerRequestRecieved(request: ServerRequest): void {
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