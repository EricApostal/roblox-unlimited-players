import { Networking } from "@flamework/networking";

interface ClientToServerEvents {
    OnJump: () => void;
}

interface ServerToClientEvents {
    SendChatMessage: (message: { playerId: number, message: string }) => void;
}

interface ClientToServerFunctions { }

interface ServerToClientFunctions { }

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
