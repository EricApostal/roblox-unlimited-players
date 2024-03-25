import { Networking } from "@flamework/networking";
import { ServerRequest } from "./replication/server-classes";

interface ClientToServerEvents {
    OnJump: () => void;
    playerLeft: (playerId: number) => void;
}

interface ServerToClientEvents {
    SendChatMessage: (message: { playerId: number, message: string }) => void;
    onEvent: (event: {}) => void;
}

interface ClientToServerFunctions {
    filterString(string: string): string;
}

interface ServerToClientFunctions { }

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
