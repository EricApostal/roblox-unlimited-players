import { Modding, OnStart, Service } from "@flamework/core";
import { Event, NetworkService, ServerRequest } from "../networking";
import { HttpService, Players } from "@rbxts/services";

export interface OnServerRequestRecieved {
    onServerRequestRecieved(request: ServerRequest): void;
}

export interface OnNetworkPlayerJoined {
    onNetworkPlayerJoined(playerId: number): void;
}

let networkPlayers = new Map<number, boolean>();

@Service()
class RequestRecievedService implements OnStart {
    onStart() {
        // request listeners
        const requestListeners = new Set<OnServerRequestRecieved>();
        Modding.onListenerAdded<OnServerRequestRecieved>((object) => requestListeners.add(object));
        Modding.onListenerRemoved<OnServerRequestRecieved>((object) => requestListeners.delete(object));

        // network player joined listeners
        const networkPlayerJoinedListeners = new Set<OnNetworkPlayerJoined>();
        Modding.onListenerAdded<OnNetworkPlayerJoined>((object) => networkPlayerJoinedListeners.add(object));
        Modding.onListenerRemoved<OnNetworkPlayerJoined>((object) => networkPlayerJoinedListeners.delete(object));

        NetworkService.event.Connect((request: ServerRequest) => {
            let events = HttpService.JSONDecode(request.events as string) as Array<Event>;
            request.events = events;

            let id = request.id;
            if (!networkPlayers.get(id)) {
                networkPlayers.set(id, true);
                networkPlayerJoinedListeners.forEach((listener) => listener.onNetworkPlayerJoined(id));
            }

            requestListeners.forEach((listener) => listener.onServerRequestRecieved(request));
        });
    }
}

// on player joined
export interface OnLocalPlayerJoined {
    onLocalPlayerJoined(player: Player): void;
}

@Service()
class LocalPlayerJoinService implements OnStart {
    onStart() {
        const listeners = new Set<OnLocalPlayerJoined>();

        Modding.onListenerAdded<OnLocalPlayerJoined>((object) => listeners.add(object));
        Modding.onListenerRemoved<OnLocalPlayerJoined>((object) => listeners.delete(object));

        Players.PlayerAdded.Connect((player) => {
            for (const listener of listeners) {
                task.spawn(() => listener.onLocalPlayerJoined(player));
            }
        })

        for (const player of Players.GetPlayers()) {
            for (const listener of listeners) {
                task.spawn(() => listener.onLocalPlayerJoined(player));
            }
        }
    }
}