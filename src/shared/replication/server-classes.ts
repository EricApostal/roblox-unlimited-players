export class Event {
    // Data
    d: unknown;

    // Event Type
    eT: EventType;

    constructor(data: unknown, eventType: EventType) {
        this.d = data;
        this.eT = eventType;
    }
}

export enum EventType {
    PlayerPositionUpdate,
    PlayerChatSend,
    PlayerLeavingUpdate,
    PlayerJumping
}

export class ServerRequest {
    id: number;
    events: string | buffer | Array<Event>;

    constructor(id: number, events: buffer | string) {
        this.id = id;
        this.events = events;
    }
}