import { BaseComponent } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { MessagingService, HttpService, Players } from "@rbxts/services";
import Signal from "@rbxts/signal";

let serverId = HttpService.GenerateGUID(false)
let threadCount: number = 20;

let networkEvent = new Signal<(data: ServerRequest) => void>();

export class ServerRequest {
    id: string;
    events: Array<Event>;

    constructor(id: string, events: Array<Event>) {
        this.id = id;
        this.events = events;
    }
}

class Topic {
    id: string;

    constructor(id: string) {
        this.id = id;
    }

    listen() {
        MessagingService.SubscribeAsync(this.id, (_d: unknown) => {
            let data = (_d as Map<string, unknown>).get("Data") as ServerRequest;
            print(`Received data: ${data} from ${this.id}`)
            print(data)

            // This seems backwards, but we don't need to differentiate per topic.
            networkEvent.Fire(data);
        })
    }

    send(eventArray: Array<Event>) {
        let status = pcall(() => {
            MessagingService.PublishAsync(this.id, new ServerRequest(serverId, eventArray));
        });

        if (!status[0]) {
            print(`Failed to send data!`)
            warn(status[1])
        }
    }
}

export class Event {
    private d: unknown;
    private eT: EventType;

    constructor(data: unknown, eventType: EventType) {
        this.d = data;
        this.eT = eventType;
    }

    getData() {
        return this.d;
    }

    getEventType() {
        return this.eT;
    }
}

export enum EventType {
    PlayerPositionUpdate,
}

export namespace NetworkService {
    let topics = new Array<Topic>()
    let eventQueue = new Array<Event>()
    export let event = networkEvent;

    for (let i = 0; i < threadCount; i++) {
        let topic = new Topic(string.format("topic-%d", i))
        topics.push(topic)
        topic.listen()
    }

    spawn(() => {
        while (true) {
            for (let topic of topics) {
                topic.send(eventQueue);
                eventQueue.clear();
                wait(0.4);
            }
        }
    });

    export function queueEvent(event: Event) {
        eventQueue.push(event);
    }
}
