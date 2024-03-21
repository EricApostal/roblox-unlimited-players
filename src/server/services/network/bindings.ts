import { Modding, OnStart, Service } from "@flamework/core";
import { Event, NetworkService, ServerRequest } from "../networking";
import { HttpService } from "@rbxts/services";

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