import { BaseComponent } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { MessagingService, HttpService, Players } from "@rbxts/services";

let serverId = HttpService.GenerateGUID(false)
let isMainServer = false;
let threadCount: number = 18;

function isHostServer() {
    let isHost = true;
    let host = MessagingService.SubscribeAsync("host", (_d: unknown) => {
        isHost = false;
    })
    wait(2);
    host.Disconnect();

    return isHost;
}

function hostThread() {
    while (true) {
        wait(1);
        
        let idList = new Array<string>();
        for (let i = 0; i < threadCount; i++) {
            idList.push(HttpService.GenerateGUID(false));
        }

        MessagingService.PublishAsync("host", idList);
    }
}
print("Checking if this is the main server...")
isMainServer = isHostServer();

if (isMainServer) {
    print("This is the main server!")
    spawn(hostThread);
}  else {
    print("This is not the main server!")
    MessagingService.PublishAsync("child-alert", serverId);
}

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
            let id = data.get("id") as string;
            let newId = data.get("nextId") as string;

            print(`Received request from ${this.id}`)
        
            if (this.id === newId) return;
            // if (id === serverId) return;

            print("Rotating ID!")
            this.id = newId;
            
            this.listenConnection?.Disconnect();
            this.listenConnection = this.listenAsync();
        })
    }

    listen() {
        let status = pcall(() => {
            this.listenConnection = this.listenAsync();
        });

        if (!status[0]) {
            print(`Failed to listen to topic ${this.id}!`)
            warn(status[1])
        }
    }

    send(data: unknown) {
        print("sending")
        this.currentDisposeRequests += 1;

        let sendData = new Map<string, unknown>()

        let oldId = this.id;
        let newId = this.id;

        if (this.currentDisposeRequests >= 1) {
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

            this.id = oldId;
        }
    }
}

print("Started the messaging service!")

let topics = new Array<Topic>();
function idListenerThread() {
    MessagingService.SubscribeAsync("host", (_d: unknown) => {
        let data = (_d as Map<string, unknown>).get("Data") as Array<string>;

        let i = 0;
        for (let topicId of data) {
            if (topics[i]) {
                topics[i].id = topicId;
            } else {
                topics.push(new Topic(topicId));
            }
            i++;
        }
    })
}


spawn(idListenerThread);

while (true) {
    for (let topic of topics) {
        topic.send({});
        wait(0.25);
    }
    wait()
}

