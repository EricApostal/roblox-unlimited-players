import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService, ServerRequest } from "../../networking";
import { BaseComponent } from "@flamework/components";
import { Players, HttpService, ReplicatedStorage } from "@rbxts/services";
import { OnServerRequestRecieved } from "../bindings";
import { replicationRigs } from "./state";

@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnServerRequestRecieved, OnStart {


    onStart() {
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
                    { x: math.round(char.PrimaryPart!.Orientation.X * precision) / precision, y: math.round(char.PrimaryPart!.Orientation.Y * precision) / precision, z: math.round(char.PrimaryPart!.Orientation.Z * precision) / precision }
                ], EventType.PlayerPositionUpdate));
            }
            wait();
        }
    }

    onServerRequestRecieved(request: ServerRequest): void {
        let playerId = request.id;

        for (let event of request.events as Array<Event>) {
            if (event.eT === EventType.PlayerPositionUpdate) {
                let data = event.d as [{ x: number, y: number, z: number }, r: { x: number, y: number, z: number }];

                let playerReplicated = replicationRigs.get(playerId as number);

                let position = data[0];
                let orientation = data[1];

                if (!playerReplicated) {
                    playerReplicated = ReplicatedStorage.WaitForChild("assets").WaitForChild("Rig").Clone() as Model;
                    playerReplicated.Parent = game.Workspace;

                    replicationRigs.set(playerId, playerReplicated);
                }

                // tween position / rotation
                let tween = game.GetService("TweenService").Create(playerReplicated!.PrimaryPart as BasePart, new TweenInfo(0.1, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut), {
                    Position: new Vector3(position.x, position.y, position.z),
                    Orientation: new Vector3(0, orientation.y, 0)
                });
                tween.Play();

            }
            wait();
        }

    }
}