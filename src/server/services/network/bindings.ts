import { Modding, OnStart, Service } from "@flamework/core";
import { Event, NetworkService, ServerRequest } from "../networking";
import { HttpService, Players } from "@rbxts/services";

export interface OnServerRequestRecieved {
    onServerRequestRecieved(request: ServerRequest): void;
}

@Service()
class RequestRecievedService implements OnStart {
    onStart() {
        const listeners = new Set<OnServerRequestRecieved>();

        Modding.onListenerAdded<OnServerRequestRecieved>((object) => listeners.add(object));
        Modding.onListenerRemoved<OnServerRequestRecieved>((object) => listeners.delete(object));

        NetworkService.event.Connect((request: ServerRequest) => {
            let events = HttpService.JSONDecode(request.events as string) as Array<Event>;
            request.events = events;

            listeners.forEach((listener) => listener.onServerRequestRecieved(request));
        });
    }
}

// on player joined
export interface OnPlayerJoined {
    onPlayerJoined(player: Player): void;
}

@Service()
class PlayerJoinService implements OnStart {
    onStart() {
        const listeners = new Set<OnPlayerJoined>();

        // Automatically updates the listeners set whenever a listener is added or removed.
        // You can do more than just keeping track of a set,
        // e.g fire the new listener's event for all existing players.
        Modding.onListenerAdded<OnPlayerJoined>((object) => listeners.add(object));
        Modding.onListenerRemoved<OnPlayerJoined>((object) => listeners.delete(object));

        Players.PlayerAdded.Connect((player) => {
            for (const listener of listeners) {
                task.spawn(() => listener.onPlayerJoined(player));
            }
        })

        for (const player of Players.GetPlayers()) {
            for (const listener of listeners) {
                task.spawn(() => listener.onPlayerJoined(player));
            }
        }
    }
}