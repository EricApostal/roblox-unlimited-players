import { OnStart, Service } from "@flamework/core";
import { Event, EventType, NetworkService, ServerRequest } from "../../networking";
import { BaseComponent } from "@flamework/components";
import { Players, Chat, HttpService, ReplicatedStorage, PhysicsService, RunService } from "@rbxts/services";
import { OnPlayerJoined, OnServerRequestRecieved } from "../bindings";
import { replicationRigs } from "./state";
import { Events } from "server/network";

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

class PlayerState {
    lastAnimationType: AnimationType | undefined;
    currentAnimationTrack: AnimationTrack | undefined;
    isJumping: boolean = false;
    velocity: Vector3 = new Vector3(0, 0, 0);
    orientation: Vector3 = new Vector3(0, 0, 0);
    lastVelocityUpdate: Vector3 = new Vector3(0, 0, 0);
    lastOrientationUpdate: Vector3 = new Vector3(0, 0, 0);
    position: Vector3 = new Vector3(0, 0, 0);
    shouldUpdatePosition: boolean = false;
}

@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnServerRequestRecieved, OnStart, OnPlayerJoined {

    playerStates: Map<number, PlayerState> | undefined

    onStart() {
        this.playerStates = new Map<number, PlayerState>();

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

                let velocityMag = new Vector3(newVelocity.x, newVelocity.y, newVelocity.z).sub(this.getPlayerState(player.UserId).lastVelocityUpdate).Magnitude;
                let orientationMag = new Vector3(newOrientation.x, newOrientation.y, newOrientation.z).sub(this.getPlayerState(player.UserId).lastOrientationUpdate).Magnitude;

                if (velocityMag < 0.01 && orientationMag < 0.01) {
                    continue;
                }

                NetworkService.queueEvent(new Event({
                    v: newVelocity,
                    o: newOrientation,
                    a: animationType
                }, EventType.PlayerPositionUpdate));

                this.getPlayerState(player.UserId).lastVelocityUpdate = new Vector3(newVelocity.x, newVelocity.y, newVelocity.z);
                this.getPlayerState(player.UserId).lastOrientationUpdate = new Vector3(newOrientation.x, newOrientation.y, newOrientation.z);
            }
            wait();
        }
    }

    onPlayerJoined(player: Player): void {
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

    getPlayerState(playerId: number): PlayerState {
        let state = this.playerStates!.get(playerId);
        if (!state) {
            state = new PlayerState();
            this.playerStates!.set(playerId, state);
        }
        return state;
    }

    /**
     * Per-second tick for velocity updates
     */

    private walkTo(playerId: number, position: Vector3) {
        let playerState = this.getPlayerState(playerId);
        let rig = replicationRigs.get(playerId)!;
        let humanoid = rig.FindFirstChild("Humanoid") as Humanoid;

        if (/*(playerState.lastAnimationType !== AnimationType.Running) ||*/ !playerState.currentAnimationTrack?.IsPlaying) {
            playerState.lastAnimationType = AnimationType.Running;
            let animation = new Instance("Animation") as Animation;
            animation.AnimationId = "rbxassetid://507767714";
            playerState.currentAnimationTrack = (rig.WaitForChild("Humanoid").WaitForChild("Animator") as Animator).LoadAnimation(animation);
            playerState.currentAnimationTrack.Play();
        }

        humanoid.MoveTo(position);

        humanoid.MoveToFinished.Connect(() => {
            if (playerState.currentAnimationTrack) playerState.currentAnimationTrack.Stop();
        })
    }

    private replicationTickThead(playerId: number) {
        while (true) {
            let playerState = this.getPlayerState(playerId);
            let rig = replicationRigs.get(playerId)!;

            let velocity = playerState.velocity;
            let timeDelta = 0.1;

            // Calculate the goal position using velocity
            let goalPosition = rig.PrimaryPart!.Position.add(velocity.mul(timeDelta * 2));

            // Adjust other parts as needed
            let goal = new Map<string, unknown>();
            goal.set("Position", goalPosition);
            goal.set("Orientation", new Vector3(0, playerState.orientation.Y, 0));

            // Apply tween to move the player to the new position
            // let tween = game.GetService("TweenService").Create(rig!.PrimaryPart as BasePart, new TweenInfo(timeDelta, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut), goal as {});
            // tween.Play();
            let humanoid = rig.FindFirstChild("Humanoid") as Humanoid;
            humanoid.WalkSpeed = 16;
            humanoid.UseJumpPower = true;

            if (goalPosition.sub(rig.PrimaryPart!.Position).Magnitude > 0.1) {
                this.walkTo(playerId, goalPosition);
            }

            wait(timeDelta);
        }
    }

    private periodicUpdateThread(playerId: number) {
        print("Started Update Thread")
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

    onServerRequestRecieved(request: ServerRequest): void {
        let playerId = request.id;

        for (let event of request.events as Array<Event>) {
            if (event.eT === EventType.PlayerPositionUpdate) {
                let data = event.d as { v: { x: number, y: number, z: number }, o: { x: number, y: number, z: number }, a: AnimationType, p: { x: number, y: number, z: number } };

                let playerReplicated = replicationRigs.get(playerId as number);

                let velocity;
                let position;
                if (data['v']) velocity = new Vector3(data['v'].x, data['v'].y, data['v'].z);
                if (data['p']) position = new Vector3(data['p'].x, data['p'].y, data['p'].z);

                let orientation = data['o'];

                if (!playerReplicated) {
                    playerReplicated = Players.CreateHumanoidModelFromUserId(playerId);
                    (playerReplicated.WaitForChild("Humanoid") as Humanoid).DisplayName = Players.GetNameFromUserIdAsync(playerId);
                    while (!Players.GetPlayers()[0]) wait();
                    playerReplicated.Parent = game.Workspace;
                    playerReplicated.MoveTo(Players.GetPlayers()[0]!.Character!.PrimaryPart!.Position);
                    playerReplicated.GetDescendants().forEach((descendant) => {
                        if (descendant.IsA("BasePart")) {
                            descendant.CollisionGroup = "replicatedplayer"
                        }
                    });
                    replicationRigs.set(playerId, playerReplicated);
                    task.spawn(() => { this.replicationTickThead(playerId) });
                    task.spawn(() => { this.periodicUpdateThread(playerId) });
                }

                let playerState = this.getPlayerState(playerId);

                if (velocity) playerState.velocity = velocity;
                if (orientation) playerState.orientation = new Vector3(orientation.x, orientation.y, orientation.z);

                if (position) {
                    let newPos = new Vector3(position.X, position.Y, position.Z);

                    if (newPos.sub(playerReplicated.PrimaryPart!.Position).Magnitude > 0.1) {
                        this.walkTo(playerId, newPos);
                    }
                }

                wait();
            }

            if (event.eT === EventType.PlayerChatSend) {
                Events.SendChatMessage(Players.GetPlayers()[0]!, { playerId: playerId, message: event.d as string });
                Chat.Chat((replicationRigs.get(playerId) as Model).FindFirstChild("Head")! as BasePart, event.d as string);
            }

            if (event.eT === EventType.PlayerLeavingUpdate) {
                let playerReplicated = replicationRigs.get(playerId as number);
                if (playerReplicated) {
                    playerReplicated.Destroy();
                    replicationRigs.delete(playerId);
                }
            }

            if (event.eT === EventType.PlayerJumping) {
                let playerReplicated = replicationRigs.get(playerId as number);
                if (playerReplicated) {
                    let humanoid = playerReplicated.WaitForChild("Humanoid") as Humanoid;
                    humanoid.Jump = true;
                }
            }
        }

    }
}
