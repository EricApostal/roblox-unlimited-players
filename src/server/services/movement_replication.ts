import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService, ServerRequest } from "./networking";
import { BaseComponent } from "@flamework/components";
import { Players } from "@rbxts/services";

@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnStart {
    replicationParts: Map<number, BasePart> = new Map();

    onStart(): void {

        NetworkService.event.Connect((request: ServerRequest) => {
            let playerId = request.id;
            print(request)
            for (let event of request.events) {
                if (event.eT === EventType.PlayerPositionUpdate) {
                    let data = event.d as { pos: { x: number, y: number, z: number } };

                    let playerReplicated = this.replicationParts.get(playerId);

                    if (!playerReplicated) {
                        playerReplicated = new Instance("Part");
                        playerReplicated.Anchored = true;
                        playerReplicated.Size = new Vector3(2, 3, 2);
                        playerReplicated.BrickColor = BrickColor.random();
                        playerReplicated.Parent = game.Workspace;
                        playerReplicated.CanCollide = false;

                        this.replicationParts.set(playerId, playerReplicated);
                    }

                    playerReplicated.Position = new Vector3(data.pos.x, data.pos.y, data.pos.z);
                }
                wait();
            }
        })

        while (true) {
            for (const player of Players.GetPlayers()) {
                let char = player.Character;
                while (!char) {
                    char = player.Character;
                    wait();
                }
                let pos = (player!.Character!.PrimaryPart!.Position);
                NetworkService.queueEvent(new Event({
                    pos: { x: math.round(pos.X * 10) / 10, y: math.round(pos.Y * 10) / 10, z: math.round(pos.Z * 10) / 10 }
                }, EventType.PlayerPositionUpdate));
            }
            wait();
        }

    }
}