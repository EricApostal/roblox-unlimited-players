import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Players, Chat, TweenService, RunService } from "@rbxts/services";
import { NetworkRecieverService } from "client/controllers/client-reciever";
import { Events } from "client/network";
import { ChatReplicator } from "client/replication/chat";
import { Event, EventType, ServerRequest } from "shared/replication/server-classes";

enum AnimationType {
    Running,
    Jumping,
    Idle
}

/*
TODO: Working on migrating most logic to client
The idea is that movement tweening will be smoother

You can send all the data, but that might not be ideal.
It might work best if you scale / filter the data based on distance *before* replicating it via remotes
*/

@Component({ tag: "replicatedplayer" })
export class ReplicatedRig extends BaseComponent implements OnStart {
    playerId: number | undefined;
    lastAnimationType: AnimationType | undefined;
    currentAnimationTrack: AnimationTrack | undefined;
    isJumping: boolean = false;
    velocity: Vector3 = new Vector3(0, 0, 0);
    orientation: Vector3 = new Vector3(0, 0, 0);
    lastVelocityUpdate: Vector3 = new Vector3(0, 0, 0);
    lastOrientationUpdate: Vector3 = new Vector3(0, 0, 0);
    position: Vector3 = new Vector3(0, 0, 0);
    moveToLocked: boolean = false;

    onStart(): void {
        this.playerId = this.instance.GetAttribute("playerId") as number;

        NetworkRecieverService.getSignal(this.playerId).Connect((request) => {
            this.onServerRequestRecieved(request as unknown as ServerRequest);
        });

        RunService.RenderStepped.Connect(() => {
            // (this.instance as Model).PrimaryPart!.Orientation = new Vector3(0, 0, 0);
        })

        task.spawn(() => this.replicationTickThead());
    }

    private onServerRequestRecieved(request: ServerRequest) {
        for (let event of request.events as Array<Event>) {
            if (event.eT === EventType.PlayerPositionUpdate) {
                let data = event.d as { v: { x: number, y: number, z: number }, o: { x: number, y: number, z: number }, a: AnimationType, p: { x: number, y: number, z: number } };

                let playerReplicated = this.instance as Model;

                let velocity;
                let position;
                if (data['v']) velocity = new Vector3(data['v'].x, data['v'].y, data['v'].z);
                if (data['p']) position = new Vector3(data['p'].x, data['p'].y, data['p'].z);

                let orientation = data['o'];

                if (velocity) this.velocity = velocity;
                if (orientation) this.orientation = new Vector3(orientation.x, orientation.y, orientation.z);

                if (position) {
                    let newPos = new Vector3(position.X, position.Y, position.Z);
                    if (newPos.sub(playerReplicated.PrimaryPart!.Position).Magnitude > 3) {
                        let newCframe = new CFrame(newPos);
                        if (orientation) {
                            newCframe = newCframe.mul(CFrame.Angles(0, orientation.y, 0));
                        }

                        let goal = {
                            CFrame: newCframe
                        }
                        // playerReplicated.PrimaryPart!.CFrame = new CFrame(newPos);
                        if (!this.moveToLocked) {
                            let tween = TweenService.Create(playerReplicated.PrimaryPart!, new TweenInfo(0.2, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut), goal);
                            tween.Play();
                            this.moveToLocked = true;
                            this.doAnimation(AnimationType.Running);
                            tween.Completed.Connect(() => {
                                // this.stopAnimation();
                                this.position = newPos;
                                this.moveToLocked = false;
                            });
                        }

                    }
                }

                wait();
            }

            if (event.eT === EventType.PlayerChatSend) {
                ChatReplicator.sendMessage(this.playerId!, event.d as string);
                Chat.Chat((this.instance as Model).FindFirstChild("Head")! as BasePart, event.d as string);
            }

            if (event.eT === EventType.PlayerLeavingUpdate) {
                let playerReplicated = this.instance as Model;
                if (playerReplicated) {
                    playerReplicated.Destroy();
                }
            }

            if (event.eT === EventType.PlayerJumping) {
                let playerReplicated = this.instance as BasePart;
                if (playerReplicated) {
                    let humanoid = playerReplicated.WaitForChild("Humanoid") as Humanoid;
                    humanoid.Jump = true;
                }
            }
        }
    }

    private doAnimation(animationType: AnimationType) {
        if (!this.currentAnimationTrack || !this.currentAnimationTrack.IsPlaying) {
            this.lastAnimationType = animationType;
            let animation = new Instance("Animation") as Animation;
            animation.AnimationId = "rbxassetid://507767714";
            this.currentAnimationTrack = ((this.instance as Model).WaitForChild("Humanoid").WaitForChild("Animator") as Animator).LoadAnimation(animation);
            this.currentAnimationTrack.Play();
        };
    }

    private stopAnimation() {
        if (this.currentAnimationTrack) {
            this.currentAnimationTrack.Stop();
            this.currentAnimationTrack = undefined;
        }
    }

    private walkTo(position: Vector3, autoRotate: boolean = true) {
        if (this.moveToLocked) return;

        let rig = this.instance as Model;
        let humanoid = rig.FindFirstChild("Humanoid") as Humanoid;

        this.doAnimation(AnimationType.Running);

        humanoid.AutoRotate = autoRotate;
        humanoid.MoveTo(position);

        let movetoBind: RBXScriptConnection;
        movetoBind = humanoid.MoveToFinished.Connect((reached: boolean) => {
            // if (this.currentAnimationTrack) this.currentAnimationTrack.Stop();
            // wait(0.25);
            // humanoid.AutoRotate = false;
            // let orientationTween = TweenService.Create((this.instance as Model)!.PrimaryPart as BasePart,
            //     new TweenInfo(0.1, Enum.EasingStyle.Linear,
            //         Enum.EasingDirection.InOut),
            //     { "Orientation": new Vector3(0, this.orientation.Y, 0) });

            // orientationTween.Completed.Connect(() => {
            //     humanoid.AutoRotate = autoRotate;
            // });

            // humanoid.AutoRotate = false;
            // (this.instance as Model).PrimaryPart!.Orientation = new Vector3(0, this.orientation.Y, 0);
            // humanoid.AutoRotate = autoRotate;

            movetoBind.Disconnect();
        })
    }

    private replicationTickThead() {
        while (true) {
            let velocity = this.velocity;
            let timeDelta = 0.1;

            // Calculate the goal position using velocity
            let goalPosition = (this.instance as Model).PrimaryPart!.Position.add(velocity.mul(timeDelta * 2.5));

            let humanoid = this.instance.FindFirstChild("Humanoid") as Humanoid;
            humanoid.WalkSpeed = 16;
            humanoid.UseJumpPower = true;

            if (goalPosition.sub((this.instance as Model).PrimaryPart!.Position).Magnitude > 2) {
                this.walkTo(goalPosition);
            } else {
                if (this.currentAnimationTrack) {
                    this.currentAnimationTrack.Stop();
                    this.currentAnimationTrack = undefined;
                }
            }

            wait(timeDelta);
        }
    }
}