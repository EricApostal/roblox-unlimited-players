import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService, ServerRequest } from "../../networking";
import { BaseComponent } from "@flamework/components";
import { Players, Chat, HttpService, ReplicatedStorage, PhysicsService, RunService } from "@rbxts/services";
import { OnLocalPlayerJoined, OnNetworkPlayerJoined, OnServerRequestRecieved } from "../bindings";

PhysicsService.RegisterCollisionGroup("localplayer")
PhysicsService.RegisterCollisionGroup("replicatedplayer")

//if (RunService.IsStudio()) {
PhysicsService.CollisionGroupSetCollidable("localplayer", "replicatedplayer", false)
//}

enum AnimationType {
    Running,
    Jumping,
    Idle
}

@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnStart, OnLocalPlayerJoined, OnNetworkPlayerJoined {
    lastVelocityUpdate = new Vector3(0, 0, 0);
    lastOrientationUpdate = new Vector3(0, 0, 0);

    onStart() {
        while (true) {
            for (const player of Players.GetPlayers()) {
                let char = player.Character;
                while (!char) {
                    char = player.Character;
                    wait();
                }

                let velocity = (player.Character!.PrimaryPart!.AssemblyLinearVelocity);
                let precision = 1;

                let speed = velocity.Magnitude;
                let isJumping = (player.Character!.FindFirstChild("Humanoid") as Humanoid)!.Jump

                let animationType = AnimationType.Idle;
                if (speed > 0) {
                    animationType = AnimationType.Running;
                }

                if (isJumping) {
                    animationType = AnimationType.Jumping;
                }

                let newVelocity = { x: math.round(velocity.X * precision) / precision, y: math.round(velocity.Y * precision) / precision, z: math.round(velocity.Z * precision) / precision };
                let newOrientation = { x: math.round(char.PrimaryPart!.Orientation.X * precision) / precision, y: math.round(char.PrimaryPart!.Orientation.Y * precision) / precision, z: math.round(char.PrimaryPart!.Orientation.Z * precision) / precision };

                let velocityMag = new Vector3(newVelocity.x, newVelocity.y, newVelocity.z).sub(this.lastVelocityUpdate).Magnitude;
                let orientationMag = new Vector3(newOrientation.x, newOrientation.y, newOrientation.z).sub(this.lastOrientationUpdate).Magnitude;

                if (velocityMag < 0.01 && orientationMag < 0.01) {
                    continue;
                }

                NetworkService.queueEvent(new Event({
                    v: newVelocity,
                    o: newOrientation,
                    a: animationType
                }, EventType.PlayerPositionUpdate));

                this.lastVelocityUpdate = new Vector3(newVelocity.x, newVelocity.y, newVelocity.z);
                this.lastOrientationUpdate = new Vector3(newOrientation.x, newOrientation.y, newOrientation.z);
            }
            wait();
        }
    }

    onNetworkPlayerJoined(playerId: number): void {
        let playerReplicated = Players.CreateHumanoidModelFromUserId(playerId);
        (playerReplicated.WaitForChild("Humanoid") as Humanoid).DisplayName = Players.GetNameFromUserIdAsync(playerId);
        while (!Players.GetPlayers()[0]) wait();
        playerReplicated.Parent = game.Workspace;
        playerReplicated.SetAttribute("playerId", playerId);
        playerReplicated.AddTag("replicatedplayer");
        playerReplicated.MoveTo(Players.GetPlayers()[0]!.Character!.PrimaryPart!.Position);
        playerReplicated.GetDescendants().forEach((descendant) => {
            if (descendant.IsA("BasePart")) {
                descendant.CollisionGroup = "replicatedplayer"
            }
        });
    }

    onLocalPlayerJoined(player: Player): void {
        player.Chatted.Connect((message) => {
            NetworkService.queueEvent(new Event(message, EventType.PlayerChatSend));
        })

        game.BindToClose(() => {
            NetworkService.queueEvent(new Event(undefined, EventType.PlayerLeavingUpdate));
            wait(1);
        });

        task.spawn(() => {
            // TODO: migrate to client
            while (!player.Character) wait();
            let humanoid = (player.Character!.WaitForChild("Humanoid") as Humanoid);

            humanoid.Jumping.Connect((active: boolean) => {
                NetworkService.queueEvent(new Event(undefined, EventType.PlayerJumping));
            });
        });

        player.CharacterAdded.Connect((char) => {
            char.GetDescendants().forEach(descendant => {
                if (descendant.IsA("BasePart")) {
                    descendant.CollisionGroup = "localplayer";
                }
            });
        })
    }
}
