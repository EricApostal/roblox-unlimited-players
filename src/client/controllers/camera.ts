import { Controller, OnStart } from "@flamework/core";
import { Players, UserInputService, RunService } from "@rbxts/services";

let horizontalCameraOffset = 0;

@Controller()
class _CameraController implements OnStart {
    onStart(): void {
        const player = Players.LocalPlayer;
        const camera = game.Workspace.CurrentCamera!;
        while (!player.Character) wait();
        const rootPart = player.Character!.WaitForChild("HumanoidRootPart") as BasePart;

        player.CameraMaxZoomDistance = 0.5;

        // Hide character parts except for HumanoidRootPart
        player.Character?.GetDescendants().forEach((child) => {
            if (child.IsA("BasePart") && child !== player.Character!.FindFirstChild("HumanoidRootPart")) {
                (child as BasePart).Transparency = 1;
            }
        });

        camera.CameraType = Enum.CameraType.Scriptable;

        let yaw = 0;
        let pitch = 0;

        // Function to update the camera position
        const updateCamera = () => {
            if (!player.Character || !player.Character.IsDescendantOf(game)) return;
            UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter;

            // Update yaw and pitch based on mouse movement
            yaw += (UserInputService.GetMouseDelta().X + (horizontalCameraOffset * -200)) / 400;
            pitch -= UserInputService.GetMouseDelta().Y / 400;

            // Limit pitch angle
            pitch = math.clamp(pitch, -math.rad(80), math.rad(80));

            // Calculate new look vector based on yaw and pitch
            const lookDirection = new Vector3(
                math.cos(yaw) * math.cos(pitch),
                math.sin(pitch),
                math.sin(yaw) * math.cos(pitch)
            ).Unit;

            // Calculate new CFrame with adjusted rotation
            const newCameraCFrame = new CFrame(rootPart.Position, rootPart.Position.add(lookDirection));

            // Lerp Cframe
            camera.CFrame = camera.CFrame.Lerp(newCameraCFrame.add(new Vector3(0, 2.5, 0)), 0.4);
        };

        RunService.RenderStepped.Connect(updateCamera);
        UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter;
    }
}

export namespace CameraController {
    export function setHorizontalOffset(offset: number) {
        horizontalCameraOffset = offset;
    }
}