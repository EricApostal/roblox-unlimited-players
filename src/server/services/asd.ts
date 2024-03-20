import { OnStart, Service } from "@flamework/core";
import { Event, NetworkService } from "./networking";
import { BaseComponent } from "@flamework/components";

@Service()
export class TestService extends BaseComponent implements OnStart {
    onStart(): void {
        print("running test service");
        while (true) {
            NetworkService.queueEvent(new Event(new Vector3(0, 0, 0)));
            wait();
        }
    }
}