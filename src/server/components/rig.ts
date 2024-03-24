import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Players, Chat } from "@rbxts/services";
import { Events } from "server/network";
import { NetworkRecieverService } from "server/services/network/reciever.";
import { Event, EventType, NetworkService, ServerRequest } from "server/services/networking";

enum AnimationType {
    Running,
    Jumping,
    Idle
}

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

        NetworkRecieverService.getSignal(this.playerId!).Connect((request: ServerRequest) => {
            this.onServerRequestRecieved(request);
        });

        task.spawn(() => this.replicationTickThead());
        task.spawn(() => this.periodicUpdateThread());
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

                    if (newPos.sub(playerReplicated.PrimaryPart!.Position).Magnitude > 0.1) {
                        this.walkTo(newPos, true);
                    }
                }

                wait();
            }

            if (event.eT === EventType.PlayerChatSend) {
                Events.SendChatMessage(Players.GetPlayers()[0]!, { playerId: this.playerId!, message: event.d as string });
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

    private walkTo(position: Vector3, lock: boolean = false) {
        // if (this.moveToLocked) return;

        if (lock) {
            //print("Added lock")
            this.moveToLocked = lock;
        }

        let rig = this.instance as Model;
        let humanoid = rig.FindFirstChild("Humanoid") as Humanoid;

        if (!this.currentAnimationTrack || !this.currentAnimationTrack.IsPlaying) {
            this.lastAnimationType = AnimationType.Running;
            let animation = new Instance("Animation") as Animation;
            animation.AnimationId = "rbxassetid://507767714";
            this.currentAnimationTrack = (rig.WaitForChild("Humanoid").WaitForChild("Animator") as Animator).LoadAnimation(animation);
            this.currentAnimationTrack.Play();
        }

        humanoid.MoveTo(position);

        let finishedSignal: RBXScriptConnection;
        finishedSignal = humanoid.MoveToFinished.Connect(() => {
            if (this.currentAnimationTrack) this.currentAnimationTrack.Stop();
            if (this.moveToLocked) {
                //print("Removing lock")
                this.moveToLocked = false;
            }
            finishedSignal.Disconnect();
        })
    }

    private replicationTickThead() {
        while (true) {
            let velocity = this.velocity;
            let timeDelta = 0.1;

            // Calculate the goal position using velocity
            let goalPosition = (this.instance as Model).PrimaryPart!.Position.add(velocity.mul(timeDelta * 3));

            // Adjust other parts as needed
            let goal = new Map<string, unknown>();
            goal.set("Position", goalPosition);
            goal.set("Orientation", new Vector3(0, this.orientation.Y, 0));

            let humanoid = this.instance.FindFirstChild("Humanoid") as Humanoid;
            humanoid.WalkSpeed = 16;
            humanoid.UseJumpPower = true;

            if (goalPosition.sub((this.instance as Model).PrimaryPart!.Position).Magnitude > 0.1) {
                this.walkTo(goalPosition);
            }

            wait(timeDelta / 2);
        }
    }

    private periodicUpdateThread() {
        while (true) {
            while (Players.GetPlayers().size() === 0) wait();
            let pos = Players.GetPlayers()[0]!.Character!.PrimaryPart!.Position;
            NetworkService.queueEvent(new Event({
                p: { x: pos.X, y: pos.Y, z: pos.Z }
            }, EventType.PlayerPositionUpdate));
            wait(1);
        }
    }
}