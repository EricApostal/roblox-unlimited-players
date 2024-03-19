import { BaseComponent } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { MessagingService, HttpService, Players } from "@rbxts/services";

let serverId = HttpService.GenerateGUID(false)

class Topic {
    id: string;

    constructor(id: string) {
        this.id = id
    }

    listen() {
        MessagingService.SubscribeAsync(this.id, (_d: unknown) => {
            let data = (_d as Map<string, unknown>).get("Data");

            if (data === serverId) return;
            print(`Received data: ${data} from ${this.id}`)
        })
    }

    send(data: unknown) {
        let status = pcall(() => {
            MessagingService.PublishAsync(this.id, data);
        });        
        if (!status[0]) {
            print(`Failed to send data!`)
            warn(status[1])
        }
    }
}

@Service()
export class NetworkService extends BaseComponent implements OnStart {
    threadCount: number = 20;
    onStart(): void {
        print("Started the messaging service!")

        let topics = new Map<string, Topic>()
        for (let i = 0; i < this.threadCount; i++) {
            let topic = new Topic(string.format("topic-%d", i))
            topics.set(topic.id, topic)
            topic.listen()
        }

        while (true) {
            for (let [_, topic] of topics) {
                topic.send(serverId);
                wait(0.34);
            }
        }
    }
}