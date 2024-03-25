import { OnStart, Service } from "@flamework/core";
import { BaseComponent } from "@flamework/components";
import { Players, Chat, HttpService, ReplicatedStorage, PhysicsService, RunService, TextService } from "@rbxts/services";
import { OnLocalPlayerJoined, OnNetworkPlayerJoined, OnServerRequestRecieved } from "../bindings";
import { Events } from "server/network";
import { NetworkService } from "server/services/networking";
import { Event, EventType } from "shared/replication/server-classes";

PhysicsService.RegisterCollisionGroup("localplayer")
PhysicsService.RegisterCollisionGroup("replicatedplayer")

if (RunService.IsStudio()) {
    PhysicsService.CollisionGroupSetCollidable("localplayer", "replicatedplayer", false)
}

enum AnimationType {
    Running,
    Jumping,
    Idle
}

@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnStart, OnLocalPlayerJoined, OnNetworkPlayerJoined {
    lastVelocityUpdate = new Vector3(0, 0, 0);
    lastOrientationUpdate = new Vector3(0, 0, 0);
    numberPrecision = 1;

    onStart() {
        task.spawn(() => {
            this.persistentUpdateThread();
        });
    }

    onNetworkPlayerJoined(playerId: number): void {
        let playerReplicated = Players.CreateHumanoidModelFromUserId(playerId);
        (playerReplicated.WaitForChild("Humanoid") as Humanoid).DisplayName = Players.GetNameFromUserIdAsync(playerId);
        while (!Players.GetPlayers()[0]) wait();
        let player = Players.GetPlayers()[0];
        playerReplicated.Parent = game.Workspace;
        playerReplicated.SetAttribute("playerId", playerId);
        playerReplicated.AddTag("replicatedplayer");
        playerReplicated.MoveTo(Players.GetPlayers()[0]!.Character!.PrimaryPart!.Position);
        playerReplicated.GetDescendants().forEach((descendant) => {
            if (descendant.IsA("BasePart")) {
                descendant.CollisionGroup = "replicatedplayer"
                descendant.SetNetworkOwner(player);
            }
        });
    }

    private persistentUpdateThread() {
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

                let newVelocity = this.getVelocity();
                let newOrientation = { x: math.round(char.PrimaryPart!.Orientation.X * precision) / precision, y: math.round(char.PrimaryPart!.Orientation.Y * precision) / precision, z: math.round(char.PrimaryPart!.Orientation.Z * precision) / precision };
                let newPosition = { x: math.round(char.PrimaryPart!.Position.X * precision) / precision, y: math.round(char.PrimaryPart!.Position.Y * precision) / precision, z: math.round(char.PrimaryPart!.Position.Z * precision) / precision };

                let velocityMag = new Vector3(newVelocity.x, newVelocity.y, newVelocity.z).sub(this.lastVelocityUpdate).Magnitude;
                let orientationMag = new Vector3(newOrientation.x, newOrientation.y, newOrientation.z).sub(this.lastOrientationUpdate).Magnitude;
                let positionMag = new Vector3(newPosition.x, newPosition.y, newPosition.z).sub(this.lastVelocityUpdate).Magnitude;

                if (positionMag < 0.01 && orientationMag < 0.01) {
                    continue;
                }

                NetworkService.queueEvent(new Event({
                    v: newVelocity,
                    o: newOrientation,
                    a: animationType,
                    p: newPosition
                }, EventType.PlayerPositionUpdate));

                this.lastVelocityUpdate = new Vector3(newVelocity.x, newVelocity.y, newVelocity.z);
                this.lastOrientationUpdate = new Vector3(newOrientation.x, newOrientation.y, newOrientation.z);
            }
            wait();
        }
    }

    private getVelocity() {
        let velocity = Players.GetPlayers()[0]!.Character!.PrimaryPart!.AssemblyLinearVelocity;
        return { x: math.round(velocity.X * this.numberPrecision) / this.numberPrecision, y: math.round(velocity.Y * this.numberPrecision) / this.numberPrecision, z: math.round(velocity.Z * this.numberPrecision) / this.numberPrecision };
    }

    private getOrientation() {
        let orientation = Players.GetPlayers()[0]!.Character!.PrimaryPart!.Orientation;
        return { x: math.round(orientation.X * this.numberPrecision) / this.numberPrecision, y: math.round(orientation.Y * this.numberPrecision) / this.numberPrecision, z: math.round(orientation.Z * this.numberPrecision) / this.numberPrecision };
    }


    onLocalPlayerJoined(player: Player): void {
        player.Chatted.Connect((message) => {
            NetworkService.queueEvent(new Event(message, EventType.PlayerChatSend));
        })

        game.BindToClose(() => {
            NetworkService.queueEvent(new Event(undefined, EventType.PlayerLeavingUpdate));
            wait(1);
        });

        Events.OnJump.connect(() => {
            NetworkService.queueEvent(new Event(undefined, EventType.PlayerJumping));
        })

        player.CharacterAdded.Connect((char) => {
            char.GetDescendants().forEach(descendant => {
                if (descendant.IsA("BasePart")) {
                    descendant.CollisionGroup = "localplayer";
                }
            });
        })
    }
}
