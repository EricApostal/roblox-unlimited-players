import { BaseComponent } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { MessagingService, HttpService, Players } from "@rbxts/services";
import Signal from "@rbxts/signal";
import { encode, decode } from "./encoding/encode";
import { Event } from "shared/replication/server-classes";
import { ServerRequest } from "shared/replication/server-classes";

let serverId: number = 0;
let threadCount: number = 28;

let networkEvent = new Signal<(data: ServerRequest) => void>();

class Topic {
    id: string;

    constructor(id: string) {
        this.id = id;
    }

    listen() {
        MessagingService.SubscribeAsync(this.id, (_d: unknown) => {
            let data = (_d as Map<string, unknown>).get("Data") as ServerRequest;
            if (
                ((data.id) === serverId)
                // && !game.GetService("RunService").IsStudio()
            ) return;

            // clean up data
            data.events = buffer.tostring(decode(data.events as buffer));

            networkEvent.Fire(data);
        })
    }

    send(eventArray: Array<Event>) {
        let text = HttpService.JSONEncode(eventArray);
        let encoded = encode(buffer.fromstring(text));

        let status = pcall(() => {
            MessagingService.PublishAsync(this.id, new ServerRequest(serverId, encoded));
        });

        if (!status[0]) {
            print(`Failed to send data!`)
            warn(status[1])
            print("Data: ")
            print(eventArray)
        }
    }
}

export namespace NetworkService {
    let topics = new Array<Topic>()
    let eventQueue = new Array<Event>()
    export let event = networkEvent;

    Players.PlayerAdded.Connect((player) => {
        print("Player added so running on 28 topics")
        serverId = player.UserId;

        for (let i = 0; i < threadCount; i++) {
            let topic = new Topic(string.format("topic-%d", i))
            topics.push(topic)
            topic.listen()
        }
    });

    spawn(() => {
        while (true) {
            for (let topic of topics) {
                while (eventQueue.size() === 0) wait();
                topic.send(eventQueue);
                eventQueue.clear();
                wait(0.6);
            }
            wait()
        }
    });

    export function queueEvent(event: Event) {
        eventQueue.push(event);
    }
}
