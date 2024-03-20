import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService, ServerRequest } from "./networking";
import { BaseComponent } from "@flamework/components";
import { Players } from "@rbxts/services";

@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnStart {
    replicationParts: Map<number, BasePart> = new Map();

    onStart(): void {

        NetworkService.event.Connect((request: ServerRequest) => {
            print(request.events)
            for (let event of request.events) {
                if (event.eT === EventType.PlayerPositionUpdate) {
                    let data = event.d as { pid: number, pos: { x: number, y: number, z: number } };
                    let playerReplicated = this.replicationParts.get(data.pid);
                    if (!playerReplicated) {
                        playerReplicated = new Instance("Part");
                        playerReplicated.Anchored = true;
                        playerReplicated.Size = new Vector3(2, 2, 2);
                        playerReplicated.BrickColor = BrickColor.random();
                        playerReplicated.Parent = game.Workspace;
                        playerReplicated.CanCollide = false;

                        this.replicationParts.set(data.pid, playerReplicated);
                    }

                    playerReplicated.Position = new Vector3(data.pos.x, data.pos.y, data.pos.z);

                    // print(`Received position update for player ${data.playerId} at ${data.position.x}, ${data.position.y}, ${data.position.z}`)
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
                    pid: player.UserId,
                    pos: { x: math.round(pos.X * 10) / 10, y: math.round(pos.Y * 10) / 10, z: math.round(pos.Z * 10) / 10 }
                }, EventType.PlayerPositionUpdate));
            }
            wait();
        }

    }
}