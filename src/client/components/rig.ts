import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Players, Chat, TweenService, RunService, TextService } from "@rbxts/services";
import { NetworkRecieverService } from "client/controllers/client-reciever";
import { Events, Functions } from "client/network";
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
    currentTween: Tween | undefined;

    onStart(): void {
        this.playerId = this.instance.GetAttribute("playerId") as number;

        NetworkRecieverService.getSignal(this.playerId).Connect((request) => {
            this.onServerRequestRecieved(request as unknown as ServerRequest);
        });

        (this.instance as Model).PrimaryPart!.Anchored = true;

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
                    let newPos = new Vector3(position.X, position.Y + 0.25, position.Z);
                    let newCframe = new CFrame(newPos).mul(CFrame.Angles(0, math.rad(orientation.y), 0));

                    let goal = {
                        CFrame: newCframe
                    }

                    let humanoid = playerReplicated.WaitForChild("Humanoid") as Humanoid;
                    humanoid.AutoRotate = false;

                    this.currentTween = TweenService.Create(playerReplicated.PrimaryPart!, new TweenInfo(0.2, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut), goal);
                    this.currentTween.Play();

                    this.currentTween.Completed.Connect(() => {
                        // humanoid.AutoRotate = true;
                        this.position = newPos;
                    });
                }

                wait();
            }

            if (event.eT === EventType.PlayerChatSend) {
                Functions.filterString(event.d as string).andThen((filteredText) => {
                    ChatReplicator.sendMessage(this.playerId!, filteredText);
                    Chat.Chat((this.instance as Model).FindFirstChild("Head")! as BasePart, filteredText);
                });
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
                    // print("Jumping")
                    // let humanoid = playerReplicated.WaitForChild("Humanoid") as Humanoid;
                    // humanoid.Jump = true;
                    // this.currentTween!.Pause();
                    // while (humanoid.Jump) wait();
                    // wait(0.5);
                    // this.currentTween!.Play();
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
        let rig = this.instance as Model;
        let humanoid = rig.FindFirstChild("Humanoid") as Humanoid;

        this.doAnimation(AnimationType.Running);

        humanoid.AutoRotate = false;
        // humanoid.MoveTo(position);

        let newCFrame = new CFrame(position).mul(CFrame.Angles(0, math.rad(this.orientation.Y), 0));
        this.currentTween = TweenService.Create(rig.PrimaryPart!, new TweenInfo(0.0, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut), { "CFrame": newCFrame });
        // this.currentTween.Play();

        // let movetoBind: RBXScriptConnection;
        // movetoBind = humanoid.MoveToFinished.Connect((reached: boolean) => {
        //     if (this.currentAnimationTrack) this.currentAnimationTrack.Stop();
        //     wait(0.25);
        //     humanoid.AutoRotate = false;
        //     let orientationTween = TweenService.Create((this.instance as Model)!.PrimaryPart as BasePart,
        //         new TweenInfo(0.1, Enum.EasingStyle.Linear,
        //             Enum.EasingDirection.InOut),
        //         { "CFrame": new CFrame((this.instance as Model)!.PrimaryPart!.Position).mul(CFrame.Angles(0, this.orientation.Y, 0)) });
        //     orientationTween.Play();

        //     orientationTween.Completed.Connect(() => {
        //         humanoid.AutoRotate = autoRotate;
        //     });

        //     humanoid.AutoRotate = false;
        //     // (this.instance as Model).PrimaryPart!.Orientation = new Vector3(0, this.orientation.Y, 0);
        //     humanoid.AutoRotate = autoRotate;

        //     movetoBind.Disconnect();
        // })
    }

    private replicationTickThead() {
        while (true) {
            let velocity = this.velocity;
            let timeDelta = 0.1;

            while (!(this.instance as Model).PrimaryPart) wait();

            // Calculate the goal position using velocity
            // let goalPosition = (this.instance as Model).PrimaryPart!.Position.add(velocity.mul(timeDelta * 2.2));
            let goalPosition = this.position;

            let humanoid = this.instance.FindFirstChild("Humanoid") as Humanoid;

            if (goalPosition.sub((this.instance as Model).PrimaryPart!.Position).Magnitude > 1) {
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