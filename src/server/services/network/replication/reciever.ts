import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService, ServerRequest } from "../../networking";
import { BaseComponent } from "@flamework/components";
import { Players, HttpService, ReplicatedStorage } from "@rbxts/services";
import { OnServerRequestRecieved } from "../bindings";
import { replicationRigs } from "./state";

enum AnimationType {
    Running,
    Jumping,
    Idle
}



@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnServerRequestRecieved, OnStart {
    lastAnimationType: AnimationType | undefined;
    currentAnimationTrack: AnimationTrack | undefined;
    isJumping: boolean = false;

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

                let speed = (player.Character!.PrimaryPart!.Velocity.Magnitude);
                let isJumping = (player.Character!.FindFirstChild("Humanoid") as Humanoid)!.Jump

                let animationType = AnimationType.Idle;
                if (speed > 0) {
                    animationType = AnimationType.Running;
                }

                if (isJumping) {
                    animationType = AnimationType.Jumping;
                }

                NetworkService.queueEvent(new Event([
                    { x: math.round(pos.X * precision) / precision, y: math.round(pos.Y * precision) / precision, z: math.round(pos.Z * precision) / precision },
                    { x: math.round(char.PrimaryPart!.Orientation.X * precision) / precision, y: math.round(char.PrimaryPart!.Orientation.Y * precision) / precision, z: math.round(char.PrimaryPart!.Orientation.Z * precision) / precision },
                    animationType
                ], EventType.PlayerPositionUpdate));
            }
            wait();
        }
    }

    onServerRequestRecieved(request: ServerRequest): void {
        let playerId = request.id;

        for (let event of request.events as Array<Event>) {
            if (event.eT === EventType.PlayerPositionUpdate) {
                let data = event.d as [{ x: number, y: number, z: number }, r: { x: number, y: number, z: number }, AnimationType];

                let playerReplicated = replicationRigs.get(playerId as number);
                let position = data[0];
                let orientation = data[1];
                let animationType = data[2] as AnimationType;

                if (!playerReplicated) {
                    playerReplicated = ReplicatedStorage.WaitForChild("assets").WaitForChild("Rig").Clone() as Model;
                    (playerReplicated.WaitForChild("Humanoid") as Humanoid).DisplayName = Players.GetNameFromUserIdAsync(playerId);
                    playerReplicated.Parent = game.Workspace;

                    replicationRigs.set(playerId, playerReplicated);
                }

                let goal = new Map<string, unknown>();

                if ((playerReplicated.PrimaryPart!.Position.sub(new Vector3(position.x, position.y, position.z))).Magnitude >= 0.5) {
                    goal.set("Position", new Vector3(position.x, position.y, position.z));
                }

                if ((playerReplicated.PrimaryPart!.Orientation.sub(new Vector3(0, orientation.y, 0))).Magnitude >= 0.5) {
                    goal.set("Orientation", new Vector3(0, orientation.y, 0));
                }

                // do animation
                if ((this.lastAnimationType !== animationType) && !this.isJumping) {
                    if (animationType === AnimationType.Running) {
                        print("playing run!")
                        this.lastAnimationType = AnimationType.Running;
                        let animation = new Instance("Animation") as Animation;
                        animation.AnimationId = "rbxassetid://507767714";
                        this.currentAnimationTrack = (playerReplicated.WaitForChild("Humanoid").WaitForChild("Animator") as Animator).LoadAnimation(animation);
                        this.currentAnimationTrack.Play();
                    }


                    if (animationType === AnimationType.Idle) {
                        this.lastAnimationType = AnimationType.Idle;
                        if (this.currentAnimationTrack) {
                            this.currentAnimationTrack.Stop();
                            this.currentAnimationTrack.Destroy();
                        }
                    }

                    if (animationType === AnimationType.Jumping) {
                        print("playing jump!")
                        this.isJumping = true;
                        this.lastAnimationType = AnimationType.Jumping;
                        let animation = new Instance("Animation") as Animation;
                        animation.AnimationId = "rbxassetid://507765000";
                        this.currentAnimationTrack = (playerReplicated.WaitForChild("Humanoid").WaitForChild("Animator") as Animator).LoadAnimation(animation);
                        this.currentAnimationTrack.Play();
                        let _link: RBXScriptConnection | undefined;
                        _link = this.currentAnimationTrack.Stopped.Connect(() => {
                            this.isJumping = false;
                            if (_link) _link.Disconnect();
                        })
                    }
                }

                let tween = game.GetService("TweenService").Create(playerReplicated!.PrimaryPart as BasePart, new TweenInfo(0.2, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut), goal as {});
                tween.Play();
                wait();
            }
        }

    }
}