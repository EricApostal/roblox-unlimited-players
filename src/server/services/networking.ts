import { BaseComponent } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { MessagingService, HttpService, Players } from "@rbxts/services";

let serverId = HttpService.GenerateGUID(false)
let threadCount: number = 20;

class Topic {
    id: string;

    constructor(id: string) {
        this.id = id
    }

    listen() {
        MessagingService.SubscribeAsync(this.id, (_d: unknown) => {
            let data = (_d as Map<string, unknown>).get("Data") as Array<Event>;

            print(`Received data: ${data} from ${this.id}`)
            print(data)
        })
    }

    send(eventArray: unknown) {
        print(typeOf(eventArray))
        let status = pcall(() => {
            MessagingService.PublishAsync(this.id, eventArray);
        });

        if (!status[0]) {
            print(`Failed to send data!`)
            warn(status[1])
        }
    }
}

export class Event {
    data: unknown;

    constructor(data: unknown) {
        this.data = data;
    }
}

export class PlayerPositionUpdateEvent extends Event {
    position: Vector3;

    constructor(position: Vector3) {
        super(position);
        this.position = position;
    }
}

export namespace NetworkService {
    let topics = new Array<Topic>()
    let eventQueue = new Array<Event>()

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
