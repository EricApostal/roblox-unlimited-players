import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService } from "./networking";
import { BaseComponent } from "@flamework/components";

@Service()
export class TestService extends BaseComponent implements OnStart {
    onStart(): void {
        print("running test service");
        while (true) {
            NetworkService.queueEvent(new Event({
                player: "test",
                position: { x: 0, y: 0, z: 0 }
            }, EventType.PlayerPositionUpdate));
            wait();
        }
    }
}