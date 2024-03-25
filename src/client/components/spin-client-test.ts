import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Players, RunService } from "@rbxts/services";

@Component({ tag: "spinny" })
export class Spinny extends BaseComponent implements OnStart {
    lastCFrame = new CFrame();
    part: BasePart;

    constructor() {
        super();
        this.part = this.instance as BasePart;
    }

    onStart() {
        while (!Players.LocalPlayer.Character) wait();
        RunService.Heartbeat.Connect(() => {
            this.playerRaycastTick();
        });
        task.spawn(() => this.spinThread());
    }

    private spinThread() {
        while (true) {
            this.part.CFrame = this.part.CFrame.mul(CFrame.Angles(0, 0.1, 0));
            wait();
        }
    }

    private playerRaycastTick() {
        let character = Players.LocalPlayer.Character!;
        let rootPart = character.WaitForChild("HumanoidRootPart") as BasePart;
        let params = new RaycastParams();

        params.FilterType = Enum.RaycastFilterType.Exclude;
        params.FilterDescendantsInstances = [character];

        let result = game.Workspace.Raycast(rootPart.Position, new Vector3(0, -15, 0), params);
        if (result && result.Instance === this.instance) {
            // move player with position / rotation of part

            let platformCframe = (this.instance as BasePart).CFrame;
            let Rel = platformCframe.mul(this.lastCFrame.Inverse());
            let teleportThreshold = 10;

            let rootPart = Players.LocalPlayer.Character!.WaitForChild("HumanoidRootPart") as BasePart;

            this.lastCFrame = (this.instance as BasePart).CFrame;

            let newCFrame = Rel.mul(rootPart.CFrame);

            if (newCFrame.Position.sub(rootPart.CFrame.Position).Magnitude < teleportThreshold) {
                rootPart.CFrame = newCFrame
            }

            // game.Workspace.CurrentCamera!.CameraType = Enum.CameraType.Scriptable;

            // rotate camera with platform
            // let camera = game.Workspace.CurrentCamera!;
            // let cameraCFrame = camera.CFrame;
            // cameraCFrame = new CFrame(cameraCFrame.Position, cameraCFrame.Position.add(platformCframe.LookVector));

        }
    }
}