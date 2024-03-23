// import { BaseComponent } from "@flamework/components";
// import { OnStart, Service } from "@flamework/core";
// import { Event, EventType, NetworkService, ServerRequest } from "server/services/networking";
// import { Players, HttpService, ReplicatedStorage } from "@rbxts/services";
// import { OnServerRequestRecieved } from "../bindings";
// import { replicationRigs } from "./state";

// enum AnimationType {
//     Running,
//     Jumping,
//     Idle
// }

// @Service()
// export class PlayerAnimationReplicationService extends BaseComponent implements OnStart, OnServerRequestRecieved {
//     currentAnimationTrack: AnimationTrack | undefined;

//     onStart(): void {
//         Players.PlayerAdded.Connect((player) => {
//             player.CharacterAdded.Connect((char) => {
//                 let humanoid = char.WaitForChild("Humanoid") as Humanoid;
//                 // on humanoid run
//                 humanoid.Running.Connect((speed: number) => {
//                     if (speed > 0) {
//                         NetworkService.queueEvent(new Event(AnimationType.Running, EventType.PlayerAnimationUpdate));
//                     } else {
//                         NetworkService.queueEvent(new Event(AnimationType.Idle, EventType.PlayerAnimationUpdate));
//                     }
//                 });

//                 humanoid.Jumping.Connect(() => {
//                     NetworkService.queueEvent(new Event(AnimationType.Jumping, EventType.PlayerAnimationUpdate));
//                 });

//             });
//         });
//     }

//     onServerRequestRecieved(request: ServerRequest): void {
//         let playerId = request.id;

//         for (let event of request.events as Array<Event>) {
//             if (event.eT === EventType.PlayerAnimationUpdate) {
//                 let data = event.d as AnimationType;
//                 if (replicationRigs.get(playerId)) {
//                     let humanoid = replicationRigs.get(playerId)!.WaitForChild("Humanoid") as Humanoid;
//                     if (data === AnimationType.Running) {
//                         print("running so playing")
//                         let animation = new Instance("Animation") as Animation;
//                         animation.AnimationId = "rbxassetid://507767714";
//                         this.currentAnimationTrack = (humanoid.WaitForChild("Animator") as Animator).LoadAnimation(animation);
//                         this.currentAnimationTrack.Play();
//                     }

//                     if (data === AnimationType.Jumping) {
//                         let animation = new Instance("Animation") as Animation;
//                         animation.AnimationId = "rbxassetid://507765000";
//                         this.currentAnimationTrack = (humanoid.WaitForChild("Animator") as Animator).LoadAnimation(animation);
//                         this.currentAnimationTrack.Play();
//                     }

//                     if (data === AnimationType.Idle) {
//                         print("idle so stopping")
//                         this.currentAnimationTrack?.Stop();
//                         this.currentAnimationTrack?.Destroy();
//                     }
//                 }
//             }
//         }
//     }
// }