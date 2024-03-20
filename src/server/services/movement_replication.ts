import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService } from "./networking";
import { BaseComponent } from "@flamework/components";
import { Players } from "@rbxts/services";

@Service()
export class TestService extends BaseComponent implements OnStart {
    onStart(): void {
        while (true) {
            for (const player of Players.GetPlayers()) {
                NetworkService.queueEvent(new Event({
                    playerId: player.UserId,
                    position: { x: 0, y: 0, z: 0 }
                }, EventType.PlayerPositionUpdate));
            }
            wait();
        }
    }
}