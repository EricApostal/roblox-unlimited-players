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

class PlayerState {
    lastAnimationType: AnimationType | undefined;
    currentAnimationTrack: AnimationTrack | undefined;
    isJumping: boolean = false;
}

@Service()
export class PlayerMovementReplicationService extends BaseComponent implements OnServerRequestRecieved, OnStart {

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

    getPlayerState(playerId: number): PlayerState {
        let state = this.playerStates!.get(playerId);
        if (!state) {
            state = new PlayerState();
            this.playerStates!.set(playerId, state);
        }
        return state;
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

                let state = this.getPlayerState(playerId);

                let goal = new Map<string, unknown>();

                if ((playerReplicated.PrimaryPart!.Position.sub(new Vector3(position.x, position.y, position.z))).Magnitude >= 0.5) {
                    goal.set("Position", new Vector3(position.x, position.y, position.z));
                }

                if ((playerReplicated.PrimaryPart!.Orientation.sub(new Vector3(0, orientation.y, 0))).Magnitude >= 0.5) {
                    goal.set("Orientation", new Vector3(0, orientation.y, 0));
                }

                // do animation
                print(animationType);
                if ((state.lastAnimationType !== animationType) && !state.isJumping) {
                    if (animationType === AnimationType.Running) {
                        state.lastAnimationType = AnimationType.Running;
                        let animation = new Instance("Animation") as Animation;
                        animation.AnimationId = "rbxassetid://507767714";
                        state.currentAnimationTrack = (playerReplicated.WaitForChild("Humanoid").WaitForChild("Animator") as Animator).LoadAnimation(animation);
                        state.currentAnimationTrack.Play();
                    }

                    if (animationType === AnimationType.Idle) {
                        state.lastAnimationType = AnimationType.Idle;
                        if (state.currentAnimationTrack) {
                            state.currentAnimationTrack.Stop();
                            state.currentAnimationTrack.Destroy();
                        }
                    }

                    if (animationType === AnimationType.Jumping) {
                        state.isJumping = true;
                        state.lastAnimationType = AnimationType.Jumping;
                        let animation = new Instance("Animation") as Animation;
                        animation.AnimationId = "rbxassetid://507765000";
                        state.currentAnimationTrack = (playerReplicated.WaitForChild("Humanoid").WaitForChild("Animator") as Animator).LoadAnimation(animation);
                        state.currentAnimationTrack.Play();
                        wait(0.25)
                        state.isJumping = false;
                    }
                }

                let tween = game.GetService("TweenService").Create(playerReplicated!.PrimaryPart as BasePart, new TweenInfo(0.1, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut), goal as {});
                tween.Play();
                wait();
            }
        }

    }
}
