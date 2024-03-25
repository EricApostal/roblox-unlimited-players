// import { BaseComponent, Component } from "@flamework/components";
// import { OnStart } from "@flamework/core";

// @Component({ tag: "spinny" })
// export class SpinnyTest extends BaseComponent implements OnStart {
//     part: BasePart;

//     constructor() {
//         super();
//         this.part = this.instance as BasePart;
//     }

//     onStart() {
//         let part = this.instance as BasePart;
//         part.Anchored = true;
//         part.Parent = game.Workspace;

//         task.spawn(() => this.spinThread());
//     }

//     private spinThread() {
//         while (true) {
//             this.part.CFrame = this.part.CFrame.mul(CFrame.Angles(0, 0.1, 0));
//             wait();
//         }
//     }
// }