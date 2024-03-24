import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Players, Chat } from "@rbxts/services";
import { Events } from "server/network";
import { NetworkRecieverService } from "server/services/network/replication/reciever.";
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
    shouldUpdatePosition: boolean = false;

    onStart(): void {
        this.playerId = this.instance.GetAttribute("playerId") as number;

        NetworkRecieverService.getSignal(this.playerId!).Connect((request: ServerRequest) => {
            print("Recieved request!")
            this.onServerRequestRecieved(request);
        });

        task.spawn(() => this.replicationTickThead(this.playerId!));
        task.spawn(() => this.periodicUpdateThread(this.playerId!));
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
                        this.walkTo(this.playerId!, newPos);
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

    private walkTo(playerId: number, position: Vector3) {
        let rig = this.instance as Model;
        let humanoid = rig.FindFirstChild("Humanoid") as Humanoid;

        if (this.currentAnimationTrack?.IsPlaying) {
            this.lastAnimationType = AnimationType.Running;
            let animation = new Instance("Animation") as Animation;
            animation.AnimationId = "rbxassetid://507767714";
            this.currentAnimationTrack = (rig.WaitForChild("Humanoid").WaitForChild("Animator") as Animator).LoadAnimation(animation);
            this.currentAnimationTrack.Play();
        }

        humanoid.MoveTo(position);

        humanoid.MoveToFinished.Connect(() => {
            if (this.currentAnimationTrack) this.currentAnimationTrack.Stop();
        })
    }

    private replicationTickThead(playerId: number) {
        while (true) {
            let velocity = this.velocity;
            let timeDelta = 0.1;

            // Calculate the goal position using velocity
            let goalPosition = (this.instance as Model).PrimaryPart!.Position.add(velocity.mul(timeDelta * 2));

            // Adjust other parts as needed
            let goal = new Map<string, unknown>();
            goal.set("Position", goalPosition);
            goal.set("Orientation", new Vector3(0, this.orientation.Y, 0));

            let humanoid = this.instance.FindFirstChild("Humanoid") as Humanoid;
            humanoid.WalkSpeed = 16;
            humanoid.UseJumpPower = true;

            if (goalPosition.sub((this.instance as Model).PrimaryPart!.Position).Magnitude > 0.1) {
                this.walkTo(playerId, goalPosition);
            }

            wait(timeDelta);
        }
    }

    private periodicUpdateThread(playerId: number) {
        // print("Started Update Thread")
        while (true) {
            // queue an update to the player's position every second
            while (Players.GetPlayers().size() === 0) wait();
            let pos = Players.GetPlayers()[0]!.Character!.PrimaryPart!.Position;
            NetworkService.queueEvent(new Event({
                p: { x: pos.X, y: pos.Y, z: pos.Z }
            }, EventType.PlayerPositionUpdate));
            print("Updated!")
            wait(1);
        }
    }
}