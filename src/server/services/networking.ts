import { BaseComponent } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { MessagingService, HttpService, Players } from "@rbxts/services";

let serverId = HttpService.GenerateGUID(false)

class Topic {
    id: string;
    listenConnection: RBXScriptConnection | undefined;
    private currentDisposeRequests: number = 0;

    constructor(id: string) {
        this.id = id
    }

    private listenAsync() {
        return MessagingService.SubscribeAsync(this.id, (_d: unknown) => {
            let data = (_d as Map<string, unknown>).get("Data") as Map<string, unknown>;
            let newId = data.get("nextId") as string;

            print(`Received request from ${this.id}`)
        
            if (this.id === newId) return;

            // if we are rotating the ID
            print("Rotating ID!")
            this.id = newId;
            
            let old = this.listenConnection;
            this.listenConnection = this.listenAsync();
            old?.Disconnect();

            
            
        })
    }

    listen() {
        this.listenConnection = this.listenAsync();
    }

    send(data: unknown) {
        this.currentDisposeRequests += 1;

        let sendData = new Map<string, unknown>()
        let newId = this.id;

        if (this.currentDisposeRequests >= 2) {
            newId = HttpService.GenerateGUID(false);
            this.currentDisposeRequests = 0;
        }

        sendData.set("id", serverId);
        sendData.set("nextId", newId)
        sendData.set("data", data);

        let status = pcall(() => {
            MessagingService.PublishAsync(this.id, sendData);
            this.id = newId;
        });
        
        if (!status[0]) {
            print(`Failed to send data!`)
            warn(status[1])
        }
    }
}

@Service()
export class NetworkService extends BaseComponent implements OnStart {
    threadCount: number = 10;
    onStart(): void {
        print("Started the messaging service!")

        let topics = new Map<string, Topic>()
        for (let i = 0; i < this.threadCount; i++) {
            let topic = new Topic(string.format("topic-%d", i))
            // print(`Created topic ${topic.id}`)
            topics.set(topic.id, topic)
            topic.listen()
        }

        while (true) {
            for (let [_, topic] of topics) {
                topic.send({});
                wait(0.25);
            }
        }
    }
}