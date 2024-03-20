import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService, ServerRequest } from "./networking";
import { BaseComponent } from "@flamework/components";
import { Players, HttpService } from "@rbxts/services";

@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnStart {
    replicationParts: Map<number, BasePart> = new Map();

    onStart(): void {

        NetworkService.event.Connect((request: ServerRequest) => {
            print(request)
            let events = HttpService.JSONDecode(request.events) as Array<Event>;
            let playerId = request.id;

            for (let event of events) {
                if (event.eT === EventType.PlayerPositionUpdate) {
                    let data = event.d as [{ x: number, y: number, z: number }, r: { x: number, y: number, z: number }];

                    let playerReplicated = this.replicationParts.get(playerId);

                    let position = data[0];
                    let rotation = data[1];

                    if (!playerReplicated) {
                        playerReplicated = new Instance("Part");
                        playerReplicated.Anchored = true;
                        playerReplicated.Size = new Vector3(2, 3, 2);
                        playerReplicated.BrickColor = BrickColor.random();
                        playerReplicated.Parent = game.Workspace;
                        playerReplicated.CanCollide = false;

                        this.replicationParts.set(playerId, playerReplicated);
                    }

                    // tween position / rotation
                    let tween = game.GetService("TweenService").Create(playerReplicated, new TweenInfo(0.1, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut), {
                        Position: new Vector3(position.x, position.y, position.z),
                        Rotation: new Vector3(0, rotation.y, 0)
                    });
                    tween.Play();

                    // playerReplicated.Position = new Vector3(position.x, position.y, position.z);
                    // playerReplicated.Rotation = new Vector3(rotation.x, rotation.y, rotation.z);

                }
                wait(0.05);
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
                let precision = 100;

                NetworkService.queueEvent(new Event([
                    { x: math.round(pos.X * precision) / precision, y: math.round(pos.Y * precision) / precision, z: math.round(pos.Z * precision) / precision },
                    { x: math.round(char.PrimaryPart!.Rotation.X * precision) / precision, y: math.round(char.PrimaryPart!.Rotation.Y * precision) / precision, z: math.round(char.PrimaryPart!.Rotation.Z * precision) / precision }
                ], EventType.PlayerPositionUpdate));
            }
            wait(0.05);
        }

    }
}