import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Players, RunService } from "@rbxts/services";
import { CameraController } from "client/controllers/camera";
import { PlayerState } from "client/state/player";

@Component({ tag: "ship" })
export class Ship extends BaseComponent implements OnStart {
    lastCFrame = new CFrame();
    model: Model;
    primaryPart: BasePart | undefined;
    lerpStep: number = 0.05;
    proximityPrompt: BasePart | undefined;

    constructor() {
        super();
        this.model = this.instance as Model;
    }

    onStart() {
        while (!Players.LocalPlayer.Character) wait();
        RunService.Heartbeat.Connect(() => {
            this.playerRaycastTick();
        });

        this.model.PrimaryPart!.Anchored = true;
        this.primaryPart = this.model.PrimaryPart as BasePart;

        task.spawn(() => this.spinThread());
    }

    private spinThread() {
        while (true) {
            this.model.PivotTo(this.model.PrimaryPart!.CFrame.mul(CFrame.Angles(0, this.lerpStep, 0)));
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

        if (result && (this.model.GetDescendants().includes(result.Instance))) {
            let platformCframe = this.primaryPart!.CFrame;
            let Rel = platformCframe.mul(this.lastCFrame.Inverse());
            let teleportThreshold = 10;

            let rootPart = Players.LocalPlayer.Character!.WaitForChild("HumanoidRootPart") as BasePart;

            this.lastCFrame = this.primaryPart!.CFrame;

            let newCFrame = Rel.mul(rootPart.CFrame);

            if (newCFrame.Position.sub(rootPart.CFrame.Position).Magnitude < teleportThreshold) {
                rootPart.CFrame = newCFrame
                CameraController.setHorizontalOffset(this.lerpStep);
            }

            // PlayerState.isSeated = true;


        } else {
            CameraController.setHorizontalOffset(0);
        }
    }
}